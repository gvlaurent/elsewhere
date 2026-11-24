# Étiquettes de tri

Le skill `/triage` range chaque ticket dans l'un des cinq rôles ci-dessous. Elsewhere garde les noms par défaut. Dans Linear, ce sont des étiquettes de l'équipe `Elsewhere`, créées avec `create_issue_label` à leur première utilisation.

| Rôle | Étiquette Linear | Sens |
| --- | --- | --- |
| à trier | `needs-triage` | ticket arrivé, pas encore examiné |
| infos manquantes | `needs-info` | impossible d'avancer sans une précision de Gabriel |
| prêt pour un agent | `ready-for-agent` | assez précis pour être codé par un agent, de bout en bout |
| prêt pour un humain | `ready-for-human` | demande un geste ou un jugement de Gabriel |
| abandonné | `wontfix` | on ne le fera pas ; passer aussi le ticket en `Canceled` |
