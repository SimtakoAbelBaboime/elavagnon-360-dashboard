import pandas as pd
import numpy as np
import json
from datetime import datetime
from pathlib import Path

pd.set_option('display.max_columns', None)

PROJECT_DIR = Path(__file__).resolve().parent
DATA_DIR = PROJECT_DIR.parent.parent / 'donnees2'

clients = pd.read_csv(DATA_DIR / '02_Comprehension_Clients_clients.csv')
achats = pd.read_csv(DATA_DIR / '02_Comprehension_Clients_achats.csv', parse_dates=['date'])
reclam = pd.read_csv(DATA_DIR / '02_Comprehension_Clients_reclamations.csv', parse_dates=['date'])
avis = pd.read_csv(DATA_DIR / '02_Comprehension_Clients_avis_clients.csv')

TODAY = achats['date'].max()  # référence temporelle = dernière date connue du dataset
print("Date de référence (today simulé) :", TODAY)

# ---------- AGRÉGATION ACHATS PAR CLIENT ----------
ag = achats.groupby('client_id').agg(
    nb_commandes=('commande_id','count'),
    montant_total=('montant_fcfa','sum'),
    montant_moyen=('montant_fcfa','mean'),
    nb_produits_distincts=('produit', pd.Series.nunique),
    derniere_commande=('date','max'),
    premiere_commande=('date','min'),
).reset_index()
ag['recence_jours'] = (TODAY - ag['derniere_commande']).dt.days
ag['anciennete_jours'] = (TODAY - ag['premiere_commande']).dt.days

# produit favori par client
prod_fav = achats.groupby(['client_id','produit']).size().reset_index(name='n')
prod_fav = prod_fav.sort_values('n', ascending=False).drop_duplicates('client_id')
prod_fav = prod_fav.rename(columns={'produit':'produit_favori'})[['client_id','produit_favori']]
ag = ag.merge(prod_fav, on='client_id', how='left')

# ---------- AVIS : sentiment ----------
POS_WORDS = ["adore","très bon","bon rapport","réponse rapide","recommande","excellent","satisfait","top","parfait"]
NEG_WORDS = ["lente","élevé","pas reçu","déçu","mauvais","problème","erreur","cher","insatisf","annulé"]

def classer_sentiment(row):
    note = row['note']
    txt = str(row['commentaire']).lower() if pd.notna(row['commentaire']) else ""
    neg_hit = any(w in txt for w in NEG_WORDS)
    pos_hit = any(w in txt for w in POS_WORDS)
    if note >= 4 or pos_hit and not neg_hit:
        return "Positif"
    if note <= 2 or neg_hit and not pos_hit:
        return "Négatif"
    return "Neutre"

avis['sentiment'] = avis.apply(classer_sentiment, axis=1)

avis_ag = avis.groupby('client_id').agg(
    note_moyenne=('note','mean'),
    nb_avis=('avis_id','count'),
).reset_index()
sent_counts = avis.groupby(['client_id','sentiment']).size().unstack(fill_value=0).reset_index()
avis_ag = avis_ag.merge(sent_counts, on='client_id', how='left')
for c in ['Positif','Neutre','Négatif']:
    if c not in avis_ag.columns: avis_ag[c]=0

# thèmes récurrents (motif implicite via mots-clés du commentaire)
THEMES = {
    "Livraison": ["livraison","reçu ma commande","lente"],
    "Prix": ["prix","cher","élevé","rapport qualité"],
    "Qualité produit": ["adore","produit"],
    "Service client": ["réponse","service"],
}
def theme_comment(txt):
    if pd.isna(txt): return None
    txt=str(txt).lower()
    for th,kws in THEMES.items():
        if any(k in txt for k in kws):
            return th
    return "Autre"
avis['theme'] = avis['commentaire'].apply(theme_comment)

# ---------- RÉCLAMATIONS ----------
grav_weight = {"Faible":1,"Moyenne":2,"Élevée":3}
reclam['poids_gravite'] = reclam['gravite'].map(grav_weight)
reclam_ag = reclam.groupby('client_id').agg(
    nb_reclamations=('reclamation_id','count'),
    gravite_totale=('poids_gravite','sum'),
    derniere_reclamation=('date','max'),
).reset_index()
nb_non_resolues = reclam[reclam['resolution']!='Résolue'].groupby('client_id').size().reset_index(name='nb_non_resolues')
reclam_ag = reclam_ag.merge(nb_non_resolues, on='client_id', how='left')
reclam_ag['nb_non_resolues'] = reclam_ag['nb_non_resolues'].fillna(0)

# ---------- FUSION 360 CLIENT ----------
df = clients.merge(ag, on='client_id', how='left') \
            .merge(avis_ag, on='client_id', how='left') \
            .merge(reclam_ag, on='client_id', how='left')

for c in ['nb_commandes','montant_total','montant_moyen','nb_produits_distincts','recence_jours','anciennete_jours',
          'note_moyenne','nb_avis','Positif','Neutre','Négatif','nb_reclamations','gravite_totale','nb_non_resolues']:
    df[c] = df[c].fillna(0)

df['satisfaction'] = df['satisfaction'].fillna(df['note_moyenne']).fillna(3)

# ---------- SCORING RFM-like ----------
def q_score(series, ascending=True, q=4):
    ranks = series.rank(method='first', ascending=ascending)
    return pd.qcut(ranks, q, labels=False) + 1

df['score_frequence'] = q_score(df['nb_commandes'], ascending=True)   # 4=achète souvent
df['score_montant']   = q_score(df['montant_total'], ascending=True)  # 4=dépense bcp
df['score_recence']   = q_score(df['recence_jours'], ascending=False) # 4=achat récent
df['score_diversite']  = q_score(df['nb_produits_distincts'], ascending=True)

df['score_valeur'] = (df['score_frequence'] + df['score_montant'] + df['score_diversite']) / 3

# ---------- SEGMENTATION STRATÉGIQUE (basée sur le rapport) ----------
def segmenter(row):
    recence = row['recence_jours']
    nb_cmd = row['nb_commandes']
    nb_reclam_nr = row['nb_non_resolues']
    diversite = row['nb_produits_distincts']
    note = row['satisfaction']

    if nb_cmd == 0:
        return "Prospect / Jamais acheté"
    if recence > 180 and nb_cmd <= 2:
        return "Explorateur à risque"
    if recence > 150:
        return "Dormant"
    if nb_cmd >= 4 and diversite >= 2 and note >= 3.5:
        return "Brand Lover"
    if nb_cmd <= 2 and recence <= 150:
        return "Acheteur Opportuniste"
    return "Régulier"

df['segment_ia'] = df.apply(segmenter, axis=1)

# ---------- SCORE DE RISQUE DE CHURN (0-100) ----------
def churn_score(row):
    s = 0
    s += min(row['recence_jours']/2.5, 45)          # jusqu'à 45 pts si très inactif
    s += min(row['nb_non_resolues']*10, 25)         # réclamations non résolues
    s += max(0, (3 - row['satisfaction'])) * 8      # satisfaction faible
    s += (5 if row['nb_commandes']<=1 else 0)
    return round(min(s,100),1)

df['risque_churn'] = df.apply(churn_score, axis=1)
def niveau_risque(s):
    if s>=60: return "Élevé"
    if s>=35: return "Moyen"
    return "Faible"
df['niveau_risque'] = df['risque_churn'].apply(niveau_risque)

print(df['segment_ia'].value_counts())
print(df['niveau_risque'].value_counts())
print(df[['client_id','segment_ia','risque_churn','niveau_risque','nb_commandes','recence_jours','satisfaction']].head(10))

df.to_csv(PROJECT_DIR / 'clients_360.csv', index=False)
achats.to_csv(PROJECT_DIR / 'achats_clean.csv', index=False)
avis.to_csv(PROJECT_DIR / 'avis_clean.csv', index=False)
reclam.to_csv(PROJECT_DIR / 'reclam_clean.csv', index=False)
