import pandas as pd
import numpy as np
import json
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent

df = pd.read_csv(PROJECT_DIR / 'clients_360.csv', parse_dates=['derniere_commande','premiere_commande'])
achats = pd.read_csv(PROJECT_DIR / 'achats_clean.csv', parse_dates=['date'])
avis = pd.read_csv(PROJECT_DIR / 'avis_clean.csv')
reclam = pd.read_csv(PROJECT_DIR / 'reclam_clean.csv', parse_dates=['date'])

out = {}

# ---- KPI GLOBAUX (Dirigeants) ----
out['kpi_globaux'] = {
    "nb_clients": int(len(df)),
    "ca_total": int(achats['montant_fcfa'].sum()),
    "nb_commandes": int(len(achats)),
    "panier_moyen": round(achats['montant_fcfa'].mean(),0),
    "satisfaction_moyenne": round(df['satisfaction'].mean(),2),
    "taux_actifs_90j": round((df['recence_jours']<=90).mean()*100,1),
    "taux_reclamations_non_resolues": round((reclam['resolution']!='Résolue').mean()*100,1),
}

# CA par segment
ca_seg = achats.merge(df[['client_id','segment_ia']], on='client_id')
out['ca_par_segment'] = ca_seg.groupby('segment_ia')['montant_fcfa'].sum().sort_values(ascending=False).round(0).astype(int).to_dict()
out['clients_par_segment'] = df['segment_ia'].value_counts().to_dict()

# CA par mois
achats['mois'] = achats['date'].dt.to_period('M').astype(str)
ca_mois = achats.groupby('mois')['montant_fcfa'].sum().sort_index()
out['ca_mensuel'] = {"labels": list(ca_mois.index), "valeurs": [int(v) for v in ca_mois.values]}

# Répartition risque churn
out['risque_churn'] = df['niveau_risque'].value_counts().to_dict()

# ---- MARKETING ----
# produits stars par segment (top 2 produits par segment)
prod_seg = achats.merge(df[['client_id','segment_ia']], on='client_id')
top_prod_seg = {}
for seg, sub in prod_seg.groupby('segment_ia'):
    top = sub.groupby('produit')['montant_fcfa'].agg(['sum','count']).sort_values('sum', ascending=False)
    top_prod_seg[seg] = [{"produit": p, "ca": int(r['sum']), "nb_commandes": int(r['count'])} for p,r in top.head(3).iterrows()]
out['top_produits_par_segment'] = top_prod_seg

# efficacité canaux (satisfaction moyenne + montant moyen par canal)
canal_perf = df.groupby('canal_acquisition').agg(
    nb_clients=('client_id','count'),
    satisfaction_moy=('satisfaction','mean'),
    ca_moyen=('montant_total','mean')
).round(2)
out['performance_canaux'] = canal_perf.reset_index().to_dict('records')

# thèmes des avis (sentiment)
out['sentiment_avis'] = avis['sentiment'].value_counts().to_dict()
out['themes_avis'] = avis['theme'].value_counts(dropna=True).to_dict()

# ---- COMMERCIAL : cross-sell ----
# pour Brand Lovers, quels produits n'ont-ils pas encore achetés parmi les plus populaires du segment
all_products = achats['produit'].unique().tolist()
brand_lovers = df[df['segment_ia']=='Brand Lover']['client_id'].tolist()
cross_sell = []
achats_by_client = achats.groupby('client_id')['produit'].apply(set).to_dict()
top_global_products = achats.groupby('produit')['montant_fcfa'].sum().sort_values(ascending=False).index.tolist()
for cid in brand_lovers:
    owned = achats_by_client.get(cid, set())
    missing = [p for p in top_global_products if p not in owned]
    if missing:
        cross_sell.append({"client_id": cid, "produits_suggeres": missing[:2]})
out['opportunites_cross_sell'] = cross_sell[:15]
out['nb_opportunites_cross_sell'] = len(cross_sell)

# ---- RELATION CLIENT : priorisation ----
reclam_client = reclam.merge(df[['client_id','segment_ia','risque_churn']], on='client_id', how='left')
reclam_client['urgence'] = reclam_client['gravite'].map({"Élevée":3,"Moyenne":2,"Faible":1}) + \
                            (reclam_client['resolution']!='Résolue').astype(int)*2 + \
                            (reclam_client['risque_churn']/100*2)
reclam_prior = reclam_client[reclam_client['resolution']!='Résolue'].sort_values('urgence', ascending=False)
out['reclamations_prioritaires'] = reclam_prior[['reclamation_id','client_id','motif','gravite','resolution','segment_ia']].head(15).to_dict('records')

out['motifs_reclamations'] = reclam['motif'].value_counts().to_dict()
out['gravite_reclamations'] = reclam['gravite'].value_counts().to_dict()

# clients à risque élevé à recontacter en priorité (relation client / commercial)
risque_eleve = df[df['niveau_risque']=='Élevé'].sort_values('risque_churn', ascending=False)
out['clients_risque_eleve'] = risque_eleve[['client_id','segment_ia','risque_churn','recence_jours','nb_commandes','satisfaction','ville']].head(20).to_dict('records')

# ---- Liste complète clients (pour table interactive, colonnes essentielles) ----
cols = ['client_id','age','sexe','ville','segment','segment_ia','canal_acquisition','nb_commandes',
        'montant_total','recence_jours','satisfaction','risque_churn','niveau_risque','produit_favori']
table = df[cols].copy()
table['montant_total'] = table['montant_total'].round(0).astype(int)
table['risque_churn'] = table['risque_churn'].round(1)
table['satisfaction'] = table['satisfaction'].round(1)
out['clients_table'] = table.fillna("").to_dict('records')

out['villes'] = df['ville'].value_counts().to_dict()

with open(PROJECT_DIR / 'dashboard_data.json','w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1, default=str)

print("OK — taille JSON:", len(json.dumps(out, default=str)), "octets")
print(json.dumps({k: (v if not isinstance(v,list) else f"[{len(v)} items]") for k,v in out.items()}, ensure_ascii=False, indent=1, default=str))
