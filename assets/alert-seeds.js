// Alertes en cours émises par les autorités de Terra Nova (F29 montée des eaux, F31 canicule).
// Fichier partagé : chargé par le navigateur (variable globale) et par server.js (module).
const TN_SEED_BROADCASTS = [
    {
        id: 'AL-2842-EAU',
        level: 'alerte',
        title: 'Montée des eaux dans le Secteur Sud',
        body: "Le Centre de surveillance environnementale observe une montée inhabituelle du niveau de l'eau dans le Secteur Sud Extérieur. Les coursives basses et les fermes hydroponiques peuvent être inondées.",
        action: [
            'Quittez les niveaux bas et rejoignez les étages supérieurs ou le point de rassemblement du sas Sud.',
            "N'empruntez aucune coursive inondée, même à pied.",
            "Coupez l'alimentation plasma des locaux touchés par l'eau.",
            'Signalez toute personne en difficulté à la Sécurité Civile.'
        ].join('\n'),
        sectors: ['Secteur Sud Extérieur'],
        source: 'Centre de surveillance environnementale',
        advice: false,
        createdAt: '2026-10-03T10:30:00.000Z',
        expiresAt: null
    },
    {
        id: 'AL-2842-CHALEUR',
        level: 'alerte',
        title: 'Vague de chaleur extrême',
        body: 'Une vague de chaleur extrême touche plusieurs secteurs de la ville. La régulation thermique des dômes est saturée et les températures restent élevées de jour comme de nuit.',
        action: [
            "Buvez de l'eau régulièrement, sans attendre la soif.",
            'Restez dans les zones climatisées aux heures les plus chaudes.',
            'Prenez des nouvelles des personnes âgées, isolées ou malades de votre entourage.',
            'En cas de malaise, de confusion ou de fièvre élevée, contactez immédiatement la Santé Biotech & Cryo-Soins.'
        ].join('\n'),
        sectors: ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2', 'Secteur Sud Extérieur'],
        source: 'Agence sanitaire de Nova Terra',
        advice: true,
        createdAt: '2026-10-03T10:30:00.000Z',
        expiresAt: null
    }
];

if (typeof module !== 'undefined') module.exports = TN_SEED_BROADCASTS;
