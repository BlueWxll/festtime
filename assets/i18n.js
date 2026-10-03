// ==========================================
// INTERNATIONALISATION (D14 interface, F27 contenus des services et démarches)
// Le dictionnaire est indexé par le texte français d'origine : le balisage reste en français
// et chaque nœud de texte (statique ou rendu par JavaScript) est traduit à l'affichage.
// ==========================================
const TN_LANGS = { fr: 'Français', en: 'English', es: 'Español' };
const TN_LOCALES = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

const TN_DICT = {
    // --- Accessibilité ---
    "Aller au contenu principal": { en: "Skip to main content", es: "Ir al contenido principal" },
    "Réglages d'accessibilité": { en: "Accessibility settings", es: "Ajustes de accesibilidad" },
    "Accessibilité": { en: "Accessibility", es: "Accesibilidad" },
    "Taille du texte :": { en: "Text size:", es: "Tamaño del texto:" },
    "Réduire la taille du texte": { en: "Decrease text size", es: "Reducir el tamaño del texto" },
    "Augmenter la taille du texte": { en: "Increase text size", es: "Aumentar el tamaño del texto" },
    "Taille normale": { en: "Normal size", es: "Tamaño normal" },
    "Affichage": { en: "Display", es: "Visualización" },
    "Contraste renforcé": { en: "High contrast", es: "Alto contraste" },
    "Réduire les animations": { en: "Reduce motion", es: "Reducir animaciones" },
    "Fermer": { en: "Close", es: "Cerrar" },
    "Fermer la fenêtre": { en: "Close window", es: "Cerrar la ventana" },
    "Contraste renforcé activé": { en: "High contrast on", es: "Alto contraste activado" },
    "Contraste renforcé désactivé": { en: "High contrast off", es: "Alto contraste desactivado" },
    "Animations réduites": { en: "Motion reduced", es: "Animaciones reducidas" },
    "Animations rétablies": { en: "Motion restored", es: "Animaciones restablecidas" },

    // --- En-tête et navigation ---
    "MÉGAPOLE EXOPLANÉTAIRE": { en: "EXOPLANETARY MEGACITY", es: "MEGALÓPOLIS EXOPLANETARIA" },
    "VAGUE:": { en: "WAVE:", es: "OLEADA:" },
    "DEMANDES:": { en: "REQUESTS:", es: "SOLICITUDES:" },
    "ACTIF": { en: "ACTIVE", es: "ACTIVA" },
    "HORS LIGNE": { en: "OFFLINE", es: "SIN CONEXIÓN" },
    "Changer de profil. Profil actuel :": { en: "Switch profile. Current profile:", es: "Cambiar de perfil. Perfil actual:" },
    "RÔLE:": { en: "ROLE:", es: "ROL:" },
    "CITOYEN": { en: "CITIZEN", es: "CIUDADANO" },
    "Changer de Profil": { en: "Switch profile", es: "Cambiar de perfil" },
    "Citoyen": { en: "Citizen", es: "Ciudadano" },
    "Public": { en: "Public", es: "Público" },
    "Agent Municipal": { en: "Municipal agent", es: "Agente municipal" },
    "Haut Conseil": { en: "High Council", es: "Alto Consejo" },
    "Connexion": { en: "Sign in", es: "Acceder" },
    "Console Directe": { en: "Direct console", es: "Consola directa" },
    "Ouvrir la console directe Aethel-OS": { en: "Open the Aethel-OS direct console", es: "Abrir la consola directa Aethel-OS" },
    "Navigation principale": { en: "Main navigation", es: "Navegación principal" },
    "ACCUEIL CITÉ": { en: "CITY HOME", es: "INICIO" },
    "SERVICES MUNICIPAUX": { en: "CITY SERVICES", es: "SERVICIOS MUNICIPALES" },
    "ACTUALITÉS & DÉCRETS": { en: "NEWS & DECREES", es: "NOTICIAS Y DECRETOS" },
    "SIGNALEMENT & CONTACT": { en: "REPORT & CONTACT", es: "AVISOS Y CONTACTO" },
    "ESPACE CITOYEN": { en: "CITIZEN AREA", es: "ÁREA CIUDADANA" },
    "ESPACE AGENTS": { en: "AGENT AREA", es: "ÁREA DE AGENTES" },

    // --- Fil d'Ariane et langue (D15, D14) ---
    "Fil d'Ariane": { en: "Breadcrumb", es: "Ruta de navegación" },
    "Vous êtes ici :": { en: "You are here:", es: "Está aquí:" },
    "Langue": { en: "Language", es: "Idioma" },
    "Langue de l'interface": { en: "Interface language", es: "Idioma de la interfaz" },
    "Accueil": { en: "Home", es: "Inicio" },
    "Services municipaux": { en: "City services", es: "Servicios municipales" },
    "Actualités & décrets": { en: "News & decrees", es: "Noticias y decretos" },
    "Signalement & contact": { en: "Report & contact", es: "Avisos y contacto" },
    "Espace citoyen": { en: "Citizen area", es: "Área ciudadana" },
    "Espace agents": { en: "Agent area", es: "Área de agentes" },
    "Services à la une": { en: "Featured services", es: "Servicios destacados" },
    "Catalogue complet": { en: "Full catalogue", es: "Catálogo completo" },
    "Signaler un problème": { en: "Report a problem", es: "Avisar de un problema" },
    "Contacter un service": { en: "Contact a service", es: "Contactar con un servicio" },
    "Demande envoyée": { en: "Request sent", es: "Solicitud enviada" },
    "Premiers pas": { en: "Getting started", es: "Primeros pasos" },
    "Mes démarches": { en: "My requests", es: "Mis trámites" },
    "Charge de travail": { en: "Workload", es: "Carga de trabajo" },
    "Flux API": { en: "API feed", es: "Flujo API" },
    "Langue : {lang}": { en: "Language: {lang}", es: "Idioma: {lang}" },

    // --- Accueil ---
    "GUIDE OFFICIEL D'ACCUEIL DES NOUVEAUX HABITANTS": { en: "OFFICIAL WELCOME GUIDE FOR NEW RESIDENTS", es: "GUÍA OFICIAL DE BIENVENIDA PARA NUEVOS HABITANTES" },
    "Bienvenue sur la colonie. Créez votre matricule citoyen, explorez les 6 services municipaux et suivez les décrets en temps réel.": {
        en: "Welcome to the colony. Create your citizen ID, explore the 6 city services and follow decrees in real time.",
        es: "Bienvenido a la colonia. Cree su matrícula ciudadana, explore los 6 servicios municipales y siga los decretos en tiempo real."
    },
    "Créer mon compte (D01)": { en: "Create my account (D01)", es: "Crear mi cuenta (D01)" },
    "Explorer la ville": { en: "Explore the city", es: "Explorar la ciudad" },
    "Station Centrale & Dôme d'Exploration": { en: "Central Station & Exploration Dome", es: "Estación Central y Cúpula de Exploración" },
    "Première métropole orbitale et sanctuaire exoplanétaire de l'humanité. Le système numérique central relie les citoyens, les équipes techniques et le Haut Conseil au cœur d'un réseau vivant et évolutif.": {
        en: "Humanity's first orbital metropolis and exoplanetary sanctuary. The central digital system connects citizens, technical teams and the High Council within a living, evolving network.",
        es: "Primera metrópolis orbital y santuario exoplanetario de la humanidad. El sistema digital central conecta a los ciudadanos, los equipos técnicos y el Alto Consejo en una red viva y en evolución."
    },
    "6 SERVICES": { en: "6 SERVICES", es: "6 SERVICIOS" },
    "Pôles municipaux": { en: "City departments", es: "Áreas municipales" },
    "DÉCRETS": { en: "DECREES", es: "DECRETOS" },
    "Journal officiel": { en: "Official journal", es: "Boletín oficial" },
    "SIGNALER": { en: "REPORT", es: "AVISAR" },
    "Doléance en ligne": { en: "Online request", es: "Solicitud en línea" },
    "MON PROFIL": { en: "MY PROFILE", es: "MI PERFIL" },
    "Espace habitant": { en: "Resident area", es: "Área del habitante" },
    "Colons Enregistrés": { en: "Registered settlers", es: "Colonos registrados" },
    "Bouclier Quantique": { en: "Quantum shield", es: "Escudo cuántico" },
    "Atmosphère Dômes": { en: "Dome atmosphere", es: "Atmósfera de las cúpulas" },
    "MATRICE TÉLÉMÉTRIQUE ORBITALE": { en: "ORBITAL TELEMETRY MATRIX", es: "MATRIZ TELEMÉTRICA ORBITAL" },
    "DISTRIBUTION PLASMA URBAIN": { en: "URBAN PLASMA DISTRIBUTION", es: "DISTRIBUCIÓN DE PLASMA URBANO" },
    "INTÉGRITÉ PRESSION DÔME ALPHA": { en: "ALPHA DOME PRESSURE INTEGRITY", es: "INTEGRIDAD DE PRESIÓN CÚPULA ALFA" },
    "FLUX DEMANDES CITOYENNES (24H)": { en: "CITIZEN REQUEST FLOW (24H)", es: "FLUJO DE SOLICITUDES CIUDADANAS (24H)" },
    "Recalibrer Matrice": { en: "Recalibrate matrix", es: "Recalibrar matriz" },

    // --- Catalogue des services (F27) ---
    "CATALOGUE OFFICIEL (EXIGENCE D05 — 250 XP)": { en: "OFFICIAL CATALOGUE (REQUIREMENT D05 — 250 XP)", es: "CATÁLOGO OFICIAL (REQUISITO D05 — 250 XP)" },
    "SERVICES MUNICIPAUX DE TERRA NOVA": { en: "TERRA NOVA CITY SERVICES", es: "SERVICIOS MUNICIPALES DE TERRA NOVA" },
    "Consultez les 6 directions centrales de la colonie. Chaque service assure la pérennité, la sécurité et la qualité de vie des colons sur ce nouveau monde.": {
        en: "Browse the colony's 6 central departments. Each service ensures the continuity, safety and quality of life of settlers on this new world.",
        es: "Consulte las 6 direcciones centrales de la colonia. Cada servicio garantiza la continuidad, la seguridad y la calidad de vida de los colonos en este nuevo mundo."
    },
    "Filtrer:": { en: "Filter:", es: "Filtrar:" },
    "Tous": { en: "All", es: "Todos" },
    "Vitaux": { en: "Vital", es: "Vitales" },
    "Citoyenneté": { en: "Citizenship", es: "Ciudadanía" },
    "Pôle Vital": { en: "Vital service", es: "Servicio vital" },
    "Mobilité": { en: "Mobility", es: "Movilidad" },
    "Énergie": { en: "Energy", es: "Energía" },
    "Santé": { en: "Health", es: "Salud" },
    "Protection": { en: "Protection", es: "Protección" },
    "Dôme Atmosphère & Biosphère": { en: "Atmosphere & Biosphere Dome", es: "Cúpula Atmósfera y Biosfera" },
    "Atmosphère & Biosphère": { en: "Atmosphere & Biosphere", es: "Atmósfera y Biosfera" },
    "Transports & Hyper-Tubes": { en: "Transport & Hyper-Tubes", es: "Transportes e Hipertubos" },
    "Énergie Plasma & Réacteur Zéro": { en: "Plasma Energy & Reactor Zero", es: "Energía de Plasma y Reactor Cero" },
    "Santé Biotech & Cryo-Soins": { en: "Biotech Health & Cryo-Care", es: "Salud Biotech y Criocuidados" },
    "Sécurité Civile & Sentinelles": { en: "Civil Security & Sentinels", es: "Seguridad Civil y Centinelas" },
    "Mairie & État Civil Spatial": { en: "City Hall & Space Civil Registry", es: "Ayuntamiento y Registro Civil Espacial" },
    "Régulation continue du mélange respirable (78% N₂, 21% O₂), filtration des particules météoritiques et recyclage de l'eau lourde pour les 4 anneaux.": {
        en: "Continuous regulation of the breathable mix (78% N₂, 21% O₂), filtering of meteoritic particles and heavy-water recycling for the 4 rings.",
        es: "Regulación continua de la mezcla respirable (78% N₂, 21% O₂), filtrado de partículas meteoríticas y reciclaje del agua pesada para los 4 anillos."
    },
    "Réseau de capsules magnétiques sous vide à 1 200 km/h reliant les dômes résidentiels au spatioport orbital et aux complexes industriels.": {
        en: "A network of vacuum magnetic pods at 1,200 km/h linking residential domes to the orbital spaceport and industrial complexes.",
        es: "Red de cápsulas magnéticas al vacío a 1 200 km/h que une las cúpulas residenciales con el espaciopuerto orbital y los complejos industriales."
    },
    "Gestion de la micro-fusion quantique, distribution des mégawatts pour les boucliers extérieurs et allocation des crédits d'énergie aux foyers.": {
        en: "Management of quantum micro-fusion, megawatt distribution for the outer shields and allocation of energy credits to households.",
        es: "Gestión de la microfusión cuántica, distribución de megavatios para los escudos exteriores y asignación de créditos de energía a los hogares."
    },
    "Régénération cellulaire, suivi des implants biolinks, protocoles d'adaptation à la gravité d'exoplanète et traitement des traumatismes cosmiques.": {
        en: "Cell regeneration, biolink implant follow-up, exoplanet gravity adaptation protocols and treatment of cosmic trauma.",
        es: "Regeneración celular, seguimiento de implantes biolink, protocolos de adaptación a la gravedad del exoplaneta y tratamiento de traumatismos cósmicos."
    },
    "Surveillance automatisée des sas de décompression, patrouilles de drones sentinelles et maintien de la paix au sein des dômes de vie.": {
        en: "Automated monitoring of decompression airlocks, sentinel drone patrols and peacekeeping within the living domes.",
        es: "Vigilancia automatizada de las esclusas de descompresión, patrullas de drones centinela y mantenimiento de la paz en las cúpulas habitadas."
    },
    "Attribution des matricules de citoyenneté spatiale, enregistrement des naissances et mariages sous dôme, et gestion des titres de propriété.": {
        en: "Issuing of space citizenship IDs, registration of births and marriages under the dome, and management of property titles.",
        es: "Asignación de matrículas de ciudadanía espacial, registro de nacimientos y matrimonios bajo la cúpula y gestión de títulos de propiedad."
    },
    "Localisation :": { en: "Location:", es: "Ubicación:" },
    "Anneau Zéro - Secteur A": { en: "Ring Zero - Sector A", es: "Anillo Cero - Sector A" },
    "Permanence :": { en: "Opening hours:", es: "Horario:" },
    "24h/24 Cycles Stellaires": { en: "24/7, stellar cycles", es: "24 h, ciclos estelares" },
    "Démarches :": { en: "Procedures:", es: "Trámites:" },
    "Signalement fuite, Analyse O2": { en: "Leak report, O2 analysis", es: "Aviso de fuga, análisis de O2" },
    "Lignes actives :": { en: "Active lines:", es: "Líneas activas:" },
    "6 Lignes Principales": { en: "6 main lines", es: "6 líneas principales" },
    "Fréquence :": { en: "Frequency:", es: "Frecuencia:" },
    "Toutes les 90 secondes": { en: "Every 90 seconds", es: "Cada 90 segundos" },
    "Titre de transport, Bagages cargo": { en: "Travel pass, cargo luggage", es: "Título de transporte, equipaje de carga" },
    "Rendement :": { en: "Output:", es: "Rendimiento:" },
    "99.98% Constant": { en: "99.98% constant", es: "99,98 % constante" },
    "Quota foyer :": { en: "Household quota:", es: "Cuota por hogar:" },
    "450 kW/cycle": { en: "450 kW/cycle", es: "450 kW/ciclo" },
    "Raccordement, Extension quota": { en: "Connection, quota extension", es: "Conexión, ampliación de cuota" },
    "Centres d'urgence :": { en: "Emergency centres:", es: "Centros de urgencias:" },
    "4 Unités Cryo": { en: "4 cryo units", es: "4 unidades crio" },
    "Télé-diagnostic :": { en: "Remote diagnosis:", es: "Telediagnóstico:" },
    "Instantané par Biolink": { en: "Instant via Biolink", es: "Instantáneo por Biolink" },
    "Visite médicale, Certificat colon": { en: "Medical visit, settler certificate", es: "Visita médica, certificado de colono" },
    "Intervention drone :": { en: "Drone response:", es: "Intervención de drones:" },
    "< 45 secondes": { en: "< 45 seconds", es: "< 45 segundos" },
    "Niveau alerte :": { en: "Alert level:", es: "Nivel de alerta:" },
    "VERT (Nominal)": { en: "GREEN (nominal)", es: "VERDE (nominal)" },
    "Signalement incident, Badge sas": { en: "Incident report, airlock badge", es: "Aviso de incidente, pase de esclusa" },
    "Délai matricule :": { en: "ID issue time:", es: "Plazo de matrícula:" },
    "Immédiat (Digital)": { en: "Immediate (digital)", es: "Inmediato (digital)" },
    "Guichet central :": { en: "Main desk:", es: "Ventanilla central:" },
    "Dôme Administratif": { en: "Administrative Dome", es: "Cúpula Administrativa" },
    "Création de compte, Changement dôme": { en: "Account creation, dome transfer", es: "Creación de cuenta, cambio de cúpula" },
    "Contacter ce Service": { en: "Contact this service", es: "Contactar con este servicio" },
    "Enregistrer un Nouvel Habitant (D01)": { en: "Register a new resident (D01)", es: "Registrar a un nuevo habitante (D01)" },

    // --- Services à la une (F28) ---
    "DÉMARCHES LES PLUS COURANTES": { en: "MOST COMMON PROCEDURES", es: "TRÁMITES MÁS HABITUALES" },
    "Les services prioritaires et les plus demandés, sans parcourir tout le catalogue.": {
        en: "Priority and most requested services, without browsing the whole catalogue.",
        es: "Los servicios prioritarios y más solicitados, sin recorrer todo el catálogo."
    },
    "Prioritaire": { en: "Priority", es: "Prioritario" },
    "Le plus demandé": { en: "Most requested", es: "El más solicitado" },
    "Commencer": { en: "Start", es: "Empezar" },
    "{n} demande(s) reçue(s)": { en: "{n} request(s) received", es: "{n} solicitud(es) recibida(s)" },
    "Mettre en avant": { en: "Feature this service", es: "Destacar" },
    "Retirer de la une": { en: "Remove from featured", es: "Quitar de destacados" },
    "Aucun service mis en avant pour le moment.": { en: "No featured service at the moment.", es: "Ningún servicio destacado por el momento." },
    "Service mis en avant : {name}": { en: "Service featured: {name}", es: "Servicio destacado: {name}" },
    "Service retiré de la une : {name}": { en: "Service removed from featured: {name}", es: "Servicio quitado de destacados: {name}" },

    // --- Actualités ---
    "INFORMATIONS OFFICIELLES (EXIGENCE D06 — 250 XP)": { en: "OFFICIAL INFORMATION (REQUIREMENT D06 — 250 XP)", es: "INFORMACIÓN OFICIAL (REQUISITO D06 — 250 XP)" },
    "ANNONCES MUNICIPALES & DÉCRETS DU CONSEIL": { en: "CITY ANNOUNCEMENTS & COUNCIL DECREES", es: "ANUNCIOS MUNICIPALES Y DECRETOS DEL CONSEJO" },
    "Le Haut Conseil et la Mairie publient régulièrement les décrets de gestion urbaine, alertes solaires et annonces de travaux d'infrastructures.": {
        en: "The High Council and City Hall regularly publish urban management decrees, solar alerts and infrastructure works notices.",
        es: "El Alto Consejo y el Ayuntamiento publican regularmente decretos de gestión urbana, alertas solares y anuncios de obras de infraestructura."
    },
    "Toutes": { en: "All", es: "Todas" },
    "Décrets": { en: "Decrees", es: "Decretos" },
    "Alertes": { en: "Alerts", es: "Alertas" },
    "Services": { en: "Services", es: "Servicios" },
    "DÉCRET N° 2842-01": { en: "DECREE NO. 2842-01", es: "DECRETO N.º 2842-01" },
    "ALERTE MÉTÉO COSMIQUE": { en: "COSMIC WEATHER ALERT", es: "ALERTA METEOROLÓGICA CÓSMICA" },
    "INFO TRAVAUX": { en: "WORKS NOTICE", es: "AVISO DE OBRAS" },
    "Ouverture Officielle du Portail Numérique Citoyen": { en: "Official Opening of the Citizen Digital Portal", es: "Apertura oficial del Portal Digital Ciudadano" },
    "Par décision unanime du Haut Conseil, la plateforme centrale de Terra Nova entre en phase opérationnelle. Chaque colon est invité à enregistrer son matricule d'accès pour utiliser les services municipaux.": {
        en: "By unanimous decision of the High Council, Terra Nova's central platform is now operational. Every settler is invited to register an access ID to use city services.",
        es: "Por decisión unánime del Alto Consejo, la plataforma central de Terra Nova entra en fase operativa. Se invita a cada colono a registrar su matrícula de acceso para utilizar los servicios municipales."
    },
    "Passage d'Orage Ionique : Renforcement des Boucliers": { en: "Ion Storm Passing: Shields Reinforced", es: "Paso de tormenta iónica: refuerzo de los escudos" },
    "Le Service de Défense informe les colons du Dôme Alpha qu'une fluctuation ionique traversera le secteur orbital. Les communications et transports de surface pourront subir de légères perturbations.": {
        en: "The Defence Service informs Alpha Dome settlers that an ionic fluctuation will cross the orbital sector. Communications and surface transport may be slightly disrupted.",
        es: "El Servicio de Defensa informa a los colonos de la Cúpula Alfa de que una fluctuación iónica atravesará el sector orbital. Las comunicaciones y los transportes de superficie podrán sufrir ligeras perturbaciones."
    },
    "Nouvelle Ligne d'Hyper-Tube vers les Serres d'Orion": { en: "New Hyper-Tube Line to the Orion Greenhouses", es: "Nueva línea de Hipertubo hacia los Invernaderos de Orión" },
    "La Direction des Transports annonce la mise en service de la navette magnétique express reliant le secteur résidentiel aux fermes hydroponiques en seulement 3 minutes.": {
        en: "The Transport Department announces the launch of the express magnetic shuttle linking the residential sector to the hydroponic farms in just 3 minutes.",
        es: "La Dirección de Transportes anuncia la puesta en servicio de la lanzadera magnética exprés que une el sector residencial con las granjas hidropónicas en solo 3 minutos."
    },
    "Mairie de Terra Nova": { en: "Terra Nova City Hall", es: "Ayuntamiento de Terra Nova" },
    "Sécurité Civile": { en: "Civil Security", es: "Seguridad Civil" },
    "Direction Transports": { en: "Transport Department", es: "Dirección de Transportes" },
    "Lire le décret": { en: "Read the decree", es: "Leer el decreto" },
    "Consulter l'alerte": { en: "View the alert", es: "Consultar la alerta" },
    "Voir les détails": { en: "See details", es: "Ver los detalles" },
    "DÉCRET OFFICIEL": { en: "OFFICIAL DECREE", es: "DECRETO OFICIAL" },

    // --- Démarches : contact et signalement (D04, F25, F27) ---
    "RELATIONS CITOYENNES (EXIGENCE D04 — 250 XP)": { en: "CITIZEN RELATIONS (REQUIREMENT D04 — 250 XP)", es: "RELACIONES CIUDADANAS (REQUISITO D04 — 250 XP)" },
    "TRANSMISSION AUX SERVICES MUNICIPAUX": { en: "SEND TO CITY SERVICES", es: "ENVÍO A LOS SERVICIOS MUNICIPALES" },
    "Une question, une difficulté ou un signalement dans votre dôme ? Soumettez votre message directement à l'administration de Terra Nova. Un récépissé horodaté avec ticket de suivi vous est immédiatement attribué.": {
        en: "A question, a difficulty or something to report in your dome? Send your message directly to the Terra Nova administration. You immediately receive a time-stamped receipt with a tracking ticket.",
        es: "¿Una pregunta, una dificultad o un aviso en su cúpula? Envíe su mensaje directamente a la administración de Terra Nova. Recibirá de inmediato un resguardo con fecha y hora y un número de seguimiento."
    },
    "Type de demande": { en: "Type of request", es: "Tipo de solicitud" },
    "Nom du Citoyen / Matricule": { en: "Citizen name / ID", es: "Nombre del ciudadano / matrícula" },
    "Anonyme ou Colon": { en: "Anonymous or settler", es: "Anónimo o colono" },
    "ex: Kaelen Vance (TN-2842-8812)": { en: "e.g. Kaelen Vance (TN-2842-8812)", es: "ej.: Kaelen Vance (TN-2842-8812)" },
    "Service Municipal Destinataire": { en: "Receiving city service", es: "Servicio municipal destinatario" },
    "Atmosphère & Biosphère (Qualité d'air, fluides)": { en: "Atmosphere & Biosphere (air quality, fluids)", es: "Atmósfera y Biosfera (calidad del aire, fluidos)" },
    "Transports & Hyper-Tubes (Navettes, voirie)": { en: "Transport & Hyper-Tubes (shuttles, roads)", es: "Transportes e Hipertubos (lanzaderas, vías)" },
    "Énergie Plasma (Alimentation, quotas)": { en: "Plasma Energy (supply, quotas)", es: "Energía de Plasma (suministro, cuotas)" },
    "Santé Biotech & Cryo-Soins (Clinique, biolinks)": { en: "Biotech Health & Cryo-Care (clinic, biolinks)", es: "Salud Biotech y Criocuidados (clínica, biolinks)" },
    "Sécurité Civile (Drones, incidents)": { en: "Civil Security (drones, incidents)", es: "Seguridad Civil (drones, incidentes)" },
    "Mairie & État Civil (Administratif, matricules)": { en: "City Hall & Civil Registry (administration, IDs)", es: "Ayuntamiento y Registro Civil (administración, matrículas)" },
    "Type de Démarche": { en: "Type of procedure", es: "Tipo de trámite" },
    "Demande d'information générale": { en: "General information request", es: "Solicitud de información general" },
    "Signalement d'anomalie ou dysfonctionnement": { en: "Report of a fault or malfunction", es: "Aviso de anomalía o avería" },
    "Doléance d'aménagement de quartier": { en: "Neighbourhood improvement request", es: "Petición de mejora del barrio" },
    "Assistance technique prioritaire": { en: "Priority technical assistance", es: "Asistencia técnica prioritaria" },
    "Niveau d'Urgence Déclaré": { en: "Declared urgency level", es: "Nivel de urgencia declarado" },
    "🟢 Normal (Traitement standard sous 24h)": { en: "🟢 Normal (standard handling within 24h)", es: "🟢 Normal (tratamiento estándar en 24 h)" },
    "🟡 Élevé (Priorité technique sous 6h)": { en: "🟡 High (technical priority within 6h)", es: "🟡 Alto (prioridad técnica en 6 h)" },
    "🔴 Critique (Alerte d'intervention immédiate)": { en: "🔴 Critical (immediate response alert)", es: "🔴 Crítico (alerta de intervención inmediata)" },
    "Objet de la Demande": { en: "Subject of the request", es: "Asunto de la solicitud" },
    "ex: Baisse de pression dans le conduit secondaire du Dôme B": { en: "e.g. Pressure drop in the secondary duct of Dome B", es: "ej.: Bajada de presión en el conducto secundario de la Cúpula B" },
    "Description Détaillée du Besoin": { en: "Detailed description of your need", es: "Descripción detallada de la necesidad" },
    "Expliquez clairement votre problème ou votre requête aux agents municipaux...": { en: "Clearly explain your problem or request to the city agents...", es: "Explique claramente su problema o solicitud a los agentes municipales..." },
    "Transmission chiffrée selon le protocole Aethel-Quantum.": { en: "Transmission encrypted with the Aethel-Quantum protocol.", es: "Transmisión cifrada según el protocolo Aethel-Quantum." },
    "Transmettre à la Mairie": { en: "Send to City Hall", es: "Enviar al Ayuntamiento" },
    "Nature du problème": { en: "Type of problem", es: "Tipo de problema" },
    "Éclairage public en panne": { en: "Street lighting out of order", es: "Alumbrado público averiado" },
    "Voirie, passerelle ou coursive dégradée": { en: "Damaged road, walkway or corridor", es: "Vía, pasarela o pasillo deteriorado" },
    "Station ou capsule Hyper-Tube": { en: "Hyper-Tube station or pod", es: "Estación o cápsula de Hipertubo" },
    "Fuite d'air, d'eau ou de fluide": { en: "Air, water or fluid leak", es: "Fuga de aire, agua o fluido" },
    "Propreté, déchets, végétation": { en: "Cleanliness, waste, vegetation", es: "Limpieza, residuos, vegetación" },
    "Danger ou incident de sécurité": { en: "Hazard or safety incident", es: "Peligro o incidente de seguridad" },
    "Autre problème": { en: "Other problem", es: "Otro problema" },
    "Service compétent : {service} (attribué automatiquement)": { en: "Responsible service: {service} (assigned automatically)", es: "Servicio competente: {service} (asignado automáticamente)" },
    "Vous n'avez pas à savoir quel service contacter : votre signalement est transmis au bon service.": {
        en: "You do not need to know which service to contact: your report is routed to the right one.",
        es: "No necesita saber a qué servicio dirigirse: su aviso se envía al servicio adecuado."
    },
    "Secteur concerné": { en: "Sector concerned", es: "Sector afectado" },
    "Dôme Alpha - Anneau 1": { en: "Alpha Dome - Ring 1", es: "Cúpula Alfa - Anillo 1" },
    "Dôme Bêta - Anneau 2": { en: "Beta Dome - Ring 2", es: "Cúpula Beta - Anillo 2" },
    "Anneau Orbital Zéro": { en: "Orbital Ring Zero", es: "Anillo Orbital Cero" },
    "Secteur Sud Extérieur": { en: "Outer South Sector", es: "Sector Sur Exterior" },
    "Je ne sais pas": { en: "I don't know", es: "No lo sé" },
    "Adresse ou repère précis": { en: "Address or precise landmark", es: "Dirección o punto de referencia" },
    "ex: Coursive 12, face au sas B — lampadaire n° 47": { en: "e.g. Corridor 12, opposite airlock B — lamp post no. 47", es: "ej.: Pasillo 12, frente a la esclusa B — farola n.º 47" },
    "Que s'est-il passé ?": { en: "What happened?", es: "¿Qué ha ocurrido?" },
    "ex: Le lampadaire est éteint depuis trois cycles et la coursive est dans le noir.": { en: "e.g. The lamp post has been off for three cycles and the corridor is dark.", es: "ej.: La farola lleva tres ciclos apagada y el pasillo está a oscuras." },
    "Envoyer le signalement": { en: "Send the report", es: "Enviar el aviso" },
    "Signalement": { en: "Report", es: "Aviso" },
    "Lieu": { en: "Location", es: "Lugar" },

    // --- Confirmation d'envoi (D16) ---
    "DEMANDE BIEN ENREGISTRÉE": { en: "REQUEST SUCCESSFULLY RECORDED", es: "SOLICITUD REGISTRADA CORRECTAMENTE" },
    "Votre demande a été transmise. Vous n'avez pas besoin de la renvoyer.": { en: "Your request has been sent. You do not need to send it again.", es: "Su solicitud ha sido enviada. No es necesario volver a enviarla." },
    "Numéro de suivi": { en: "Tracking number", es: "Número de seguimiento" },
    "Service destinataire": { en: "Receiving service", es: "Servicio destinatario" },
    "Objet": { en: "Subject", es: "Asunto" },
    "Envoyée le": { en: "Sent on", es: "Enviada el" },
    "État actuel": { en: "Current status", es: "Estado actual" },
    "En attente de prise en charge par un agent": { en: "Waiting to be taken in charge by an agent", es: "A la espera de que un agente la atienda" },
    "Prochaine étape : un agent municipal prend en charge votre demande. Son état est mis à jour dans votre espace citoyen.": {
        en: "Next step: a city agent takes charge of your request. Its status is updated in your citizen area.",
        es: "Siguiente paso: un agente municipal se hace cargo de su solicitud. Su estado se actualiza en su área ciudadana."
    },
    "Conservez ce numéro : connectez-vous pour suivre vos demandes dans l'espace citoyen.": {
        en: "Keep this number: sign in to follow your requests in the citizen area.",
        es: "Conserve este número: acceda para seguir sus solicitudes en el área ciudadana."
    },
    "Suivre ma demande": { en: "Track my request", es: "Seguir mi solicitud" },
    "Envoyer une autre demande": { en: "Send another request", es: "Enviar otra solicitud" },
    "Demande {id} enregistrée et transmise au service {service}.": { en: "Request {id} recorded and sent to {service}.", es: "Solicitud {id} registrada y enviada al servicio {service}." },
    "Vous avez déjà envoyé une demande identique il y a peu ({id}). Voulez-vous vraiment l'envoyer à nouveau ?": {
        en: "You already sent an identical request a moment ago ({id}). Do you really want to send it again?",
        es: "Ya envió una solicitud idéntica hace poco ({id}). ¿Seguro que quiere enviarla de nuevo?"
    },

    // --- Espace citoyen ---
    "ESPACE PERSONNEL SÉCURISÉ (EXIGENCES D01 & D03 — 500 XP)": { en: "SECURE PERSONAL AREA (REQUIREMENTS D01 & D03 — 500 XP)", es: "ÁREA PERSONAL SEGURA (REQUISITOS D01 Y D03 — 500 XP)" },
    "PORTAIL CITOYEN DE TERRA NOVA": { en: "TERRA NOVA CITIZEN PORTAL", es: "PORTAL CIUDADANO DE TERRA NOVA" },
    "Retrouvez votre matricule de colon, votre dôme de rattachement, l'historique de vos démarches et le suivi en temps réel de vos requêtes administratives.": {
        en: "Find your settler ID, your home dome, the history of your procedures and real-time tracking of your administrative requests.",
        es: "Consulte su matrícula de colono, su cúpula de adscripción, el historial de sus trámites y el seguimiento en tiempo real de sus solicitudes administrativas."
    },
    "Se Connecter": { en: "Sign in", es: "Acceder" },
    "Créer un Compte": { en: "Create an account", es: "Crear una cuenta" },
    "PASSEPORT COLONIAL OFFICIEL": { en: "OFFICIAL COLONIAL PASSPORT", es: "PASAPORTE COLONIAL OFICIAL" },
    "VALIDE": { en: "VALID", es: "VÁLIDO" },
    "Secteur Domicile :": { en: "Home sector:", es: "Sector de residencia:" },
    "Date d'Arrimage :": { en: "Docking date:", es: "Fecha de acoplamiento:" },
    "Statut Juridique :": { en: "Legal status:", es: "Estatus jurídico:" },
    "Colon de Plein Droit": { en: "Full settler", es: "Colono de pleno derecho" },
    "Allocation Plasma :": { en: "Plasma allowance:", es: "Asignación de plasma:" },
    "Changer de Compte": { en: "Switch account", es: "Cambiar de cuenta" },
    "Déconnexion": { en: "Sign out", es: "Cerrar sesión" },
    "Non Connecté": { en: "Not signed in", es: "Sin sesión" },
    "Visiteur spatial": { en: "Space visitor", es: "Visitante espacial" },
    "Transit": { en: "In transit", es: "En tránsito" },
    "MES DÉMARCHES : SUIVI & HISTORIQUE": { en: "MY REQUESTS: TRACKING & HISTORY", es: "MIS TRÁMITES: SEGUIMIENTO E HISTORIAL" },
    "L'état de chaque demande, les étapes déjà réalisées et toutes vos demandes précédentes.": {
        en: "The status of each request, the steps already completed and all your previous requests.",
        es: "El estado de cada solicitud, los pasos ya realizados y todas sus solicitudes anteriores."
    },
    "Nouvelle Démarche (D04)": { en: "New request (D04)", es: "Nuevo trámite (D04)" },

    // --- Suivi et historique (D11, F26) ---
    "En cours de traitement ({n})": { en: "In progress ({n})", es: "En tramitación ({n})" },
    "Historique complet ({n})": { en: "Full history ({n})", es: "Historial completo ({n})" },
    "Rechercher dans mes demandes": { en: "Search my requests", es: "Buscar en mis solicitudes" },
    "N° de suivi, objet, service…": { en: "Tracking no., subject, service…", es: "N.º de seguimiento, asunto, servicio…" },
    "Filtrer par état": { en: "Filter by status", es: "Filtrar por estado" },
    "Tous les états": { en: "All statuses", es: "Todos los estados" },
    "En attente": { en: "Pending", es: "Pendiente" },
    "En cours": { en: "In progress", es: "En curso" },
    "Résolu": { en: "Resolved", es: "Resuelta" },
    "Envoyée": { en: "Sent", es: "Enviada" },
    "Prise en charge": { en: "Taken in charge", es: "Atendida" },
    "Résolue": { en: "Resolved", es: "Resuelta" },
    "Étape réalisée": { en: "Step completed", es: "Paso realizado" },
    "Étape à venir": { en: "Upcoming step", es: "Paso pendiente" },
    "Détail et étapes réalisées": { en: "Details and completed steps", es: "Detalle y pasos realizados" },
    "Votre message": { en: "Your message", es: "Su mensaje" },
    "Urgence": { en: "Urgency", es: "Urgencia" },
    "Normal": { en: "Normal", es: "Normal" },
    "Élevé": { en: "High", es: "Alto" },
    "Critique": { en: "Critical", es: "Crítico" },
    "Chronologie": { en: "Timeline", es: "Cronología" },
    "Demande envoyée aux services municipaux": { en: "Request sent to city services", es: "Solicitud enviada a los servicios municipales" },
    "Prise en charge par un agent municipal": { en: "Taken in charge by a city agent", es: "Atendida por un agente municipal" },
    "Demande résolue et clôturée": { en: "Request resolved and closed", es: "Solicitud resuelta y cerrada" },
    "Demande rouverte par un agent": { en: "Request reopened by an agent", es: "Solicitud reabierta por un agente" },
    "date non enregistrée": { en: "date not recorded", es: "fecha no registrada" },
    "Connectez-vous pour retrouver vos démarches, leur état et leur historique.": { en: "Sign in to find your requests, their status and their history.", es: "Acceda para consultar sus trámites, su estado y su historial." },
    "Aucune démarche en cours. Vos demandes résolues restent disponibles dans l'historique.": { en: "No request in progress. Your resolved requests remain available in the history.", es: "Ningún trámite en curso. Sus solicitudes resueltas siguen disponibles en el historial." },
    "Aucune demande pour le moment. Utilisez le formulaire pour transmettre votre premier besoin.": { en: "No request yet. Use the form to send your first request.", es: "Aún no hay solicitudes. Utilice el formulario para enviar su primera necesidad." },
    "Aucune demande ne correspond à cette recherche.": { en: "No request matches this search.", es: "Ninguna solicitud coincide con esta búsqueda." },
    "{n} demande(s) affichée(s)": { en: "{n} request(s) shown", es: "{n} solicitud(es) mostrada(s)" },

    // --- Premiers pas (D12) ---
    "PREMIERS PAS À TERRA NOVA": { en: "GETTING STARTED IN TERRA NOVA", es: "PRIMEROS PASOS EN TERRA NOVA" },
    "Bienvenue {name}. Trois étapes pour utiliser les services de la ville.": { en: "Welcome {name}. Three steps to start using city services.", es: "Bienvenido/a {name}. Tres pasos para utilizar los servicios de la ciudad." },
    "{done} étape(s) sur 3 réalisée(s)": { en: "{done} of 3 steps completed", es: "{done} de 3 pasos realizados" },
    "Compléter mon profil": { en: "Complete my profile", es: "Completar mi perfil" },
    "Indiquez comment vous joindre et votre langue : les services vous répondent plus vite.": { en: "Tell us how to reach you and your language: services will answer faster.", es: "Indique cómo contactarle y su idioma: los servicios le responderán más rápido." },
    "Adresse de contact (holo-courriel)": { en: "Contact address (holo-mail)", es: "Dirección de contacto (holo-correo)" },
    "ex: thalia.kren@terranova.city": { en: "e.g. thalia.kren@terranova.city", es: "ej.: thalia.kren@terranova.city" },
    "Langue préférée": { en: "Preferred language", es: "Idioma preferido" },
    "Dôme de résidence": { en: "Home dome", es: "Cúpula de residencia" },
    "Recevoir une notification à chaque changement d'état de mes demandes": { en: "Notify me whenever the status of my requests changes", es: "Recibir una notificación con cada cambio de estado de mis solicitudes" },
    "Enregistrer mon profil": { en: "Save my profile", es: "Guardar mi perfil" },
    "Modifier mon profil": { en: "Edit my profile", es: "Modificar mi perfil" },
    "Profil enregistré.": { en: "Profile saved.", es: "Perfil guardado." },
    "Trouver un service": { en: "Find a service", es: "Encontrar un servicio" },
    "Les démarches les plus courantes sont mises en avant en haut du catalogue.": { en: "The most common procedures are featured at the top of the catalogue.", es: "Los trámites más habituales aparecen destacados al inicio del catálogo." },
    "Voir les services à la une": { en: "See featured services", es: "Ver los servicios destacados" },
    "Commencer une démarche": { en: "Start a procedure", es: "Iniciar un trámite" },
    "Posez une question à un service ou signalez un problème dans votre secteur.": { en: "Ask a service a question or report a problem in your sector.", es: "Haga una pregunta a un servicio o avise de un problema en su sector." },
    "Fait": { en: "Done", es: "Hecho" },
    "À faire": { en: "To do", es: "Pendiente" },
    "Masquer ce guide": { en: "Hide this guide", es: "Ocultar esta guía" },
    "Parcours d'accueil terminé. Vous savez maintenant utiliser les services de Terra Nova.": { en: "Welcome tour completed. You now know how to use Terra Nova's services.", es: "Recorrido de bienvenida completado. Ya sabe utilizar los servicios de Terra Nova." },
    "Revoir le guide de premiers pas": { en: "Show the getting-started guide again", es: "Volver a ver la guía de primeros pasos" },
    "BIENVENUE SUR TERRA NOVA !\nVotre compte colon a été créé avec succès.\nVotre matricule officiel est : {matricule}\nConservez-le précieusement.": {
        en: "WELCOME TO TERRA NOVA!\nYour settler account has been created.\nYour official ID is: {matricule}\nKeep it safe.",
        es: "¡BIENVENIDO/A A TERRA NOVA!\nSu cuenta de colono se ha creado correctamente.\nSu matrícula oficial es: {matricule}\nConsérvela bien."
    },
    "Connexion réussie. Bienvenue, {name}.": { en: "Signed in. Welcome, {name}.", es: "Sesión iniciada. Bienvenido/a, {name}." },
    "Matricule ou identifiant non reconnu sur la colonie. Vérifiez votre saisie ou enregistrez-vous.": {
        en: "ID or name not recognised in the colony. Check your entry or register.",
        es: "Matrícula o identificador no reconocido en la colonia. Compruebe los datos o regístrese."
    },
    "Confirmer la déconnexion de l'espace citoyen ?": { en: "Confirm signing out of the citizen area?", es: "¿Confirmar el cierre de sesión del área ciudadana?" },

    // --- Espace agents (D09, D17, F22) ---
    "ACCÈS RESTREINT — ZONE RÉSERVÉE AUX AGENTS MUNICIPAUX (D09 RBAC)": { en: "RESTRICTED ACCESS — AREA RESERVED FOR CITY AGENTS (D09 RBAC)", es: "ACCESO RESTRINGIDO — ZONA RESERVADA A LOS AGENTES MUNICIPALES (D09 RBAC)" },
    "Votre profil actuel est configuré en mode": { en: "Your current profile is set to", es: "Su perfil actual está configurado en modo" },
    ". Selon les protocoles de sécurité de Terra Nova (D09), les citoyens ne peuvent pas accéder aux outils techniques internes ni aux fonctions sensibles de gestion des demandes.": {
        en: ". Under Terra Nova's security protocols (D09), citizens cannot access internal technical tools or sensitive request-management functions.",
        es: ". Según los protocolos de seguridad de Terra Nova (D09), los ciudadanos no pueden acceder a las herramientas técnicas internas ni a las funciones sensibles de gestión de solicitudes."
    },
    "Basculer sur le Profil Agent Municipal pour Tester": { en: "Switch to the city agent profile to test", es: "Cambiar al perfil de agente municipal para probar" },
    "AGENT": { en: "AGENT", es: "AGENTE" },
    "ESPACE DE TRAVAIL DES AGENTS (EXIGENCES D19 & F22 — 1000 XP)": { en: "AGENT WORKSPACE (REQUIREMENTS D19 & F22 — 1000 XP)", es: "ESPACIO DE TRABAJO DE LOS AGENTES (REQUISITOS D19 Y F22 — 1000 XP)" },
    "Supervision en temps réel des flux API de Terra Nova, suivi des vagues du concours Webcup et traitement opérationnel des demandes citoyennes.": { en: "Real-time supervision of Terra Nova API feeds, tracking of Webcup contest waves and operational handling of citizen requests.", es: "Supervisión en tiempo real de los flujos API de Terra Nova, seguimiento de las oleadas del concurso Webcup y tramitación operativa de las solicitudes ciudadanas." },
    "En cours d'exécution": { en: "Running", es: "En ejecución" },
    "TRAITEMENT DES REQUÊTES HABITANTS (EXIGENCE F22 — 250 XP)": { en: "RESIDENT REQUEST HANDLING (REQUIREMENT F22 — 250 XP)", es: "TRAMITACIÓN DE SOLICITUDES DE LOS HABITANTES (REQUISITO F22 — 250 XP)" },
    "FLUX D'INFRASTRUCTURE (EXIGENCE D19 — 750 XP)": { en: "INFRASTRUCTURE FEED (REQUIREMENT D19 — 750 XP)", es: "FLUJO DE INFRAESTRUCTURA (REQUISITO D19 — 750 XP)" },
    "DEMANDES TRANSMISES PAR L'API WEBCUP (NOVA TERRA)": { en: "REQUESTS SENT BY THE WEBCUP API (NOVA TERRA)", es: "SOLICITUDES ENVIADAS POR LA API WEBCUP (NOVA TERRA)" },
    "Flux dynamique consommé via l'API officielle. Utilisez les filtres ci-dessous pour analyser chaque demande, son barème en XP et son niveau de difficulté.": { en: "Live feed consumed through the official API. Use the filters below to review each request, its XP value and its difficulty level.", es: "Flujo dinámico consumido a través de la API oficial. Utilice los filtros para analizar cada solicitud, su puntuación en XP y su nivel de dificultad." },
    "Difficulté:": { en: "Difficulty:", es: "Dificultad:" },
    "Facile (250 XP)": { en: "Easy (250 XP)", es: "Fácil (250 XP)" },
    "Moyenne (500 XP)": { en: "Medium (500 XP)", es: "Media (500 XP)" },
    "Difficile (750 XP)": { en: "Hard (750 XP)", es: "Difícil (750 XP)" },
    "BACKOFFICE DE SUPERVISION MUNICIPALE": { en: "CITY SUPERVISION BACK OFFICE", es: "BACKOFFICE DE SUPERVISIÓN MUNICIPAL" },
    "Actualiser l'API": { en: "Refresh the API", es: "Actualizar la API" },
    "Statut Session API": { en: "API session status", es: "Estado de la sesión API" },
    "Vague Actuelle": { en: "Current wave", es: "Oleada actual" },
    "Demandes Accessibles": { en: "Available requests", es: "Solicitudes accesibles" },
    "Prochaine Vague": { en: "Next wave", es: "Próxima oleada" },
    "GESTIONNAIRE TECHNIQUE DES DEMANDES CITOYENNES": { en: "CITIZEN REQUEST MANAGER", es: "GESTOR DE SOLICITUDES CIUDADANAS" },
    "Traitez les sollicitations reçues des habitants de Terra Nova. Mettez à jour leur état pour informer les citoyens en temps réel.": {
        en: "Handle the requests received from Terra Nova residents. Update their status to inform citizens in real time.",
        es: "Tramite las solicitudes recibidas de los habitantes de Terra Nova. Actualice su estado para informar a los ciudadanos en tiempo real."
    },
    "Toutes (": { en: "All (", es: "Todas (" },
    "En attente (": { en: "Pending (", es: "Pendientes (" },
    "En cours (": { en: "In progress (", es: "En curso (" },
    "Résolues (": { en: "Resolved (", es: "Resueltas (" },
    "Ticket": { en: "Ticket", es: "Ticket" },
    "Service Concerne": { en: "Service", es: "Servicio" },
    "Objet & Message": { en: "Subject & message", es: "Asunto y mensaje" },
    "Statut Actuel": { en: "Current status", es: "Estado actual" },
    "Action Agent": { en: "Agent action", es: "Acción del agente" },
    "Prendre en charge": { en: "Take in charge", es: "Atender" },
    "Clôturer": { en: "Close", es: "Cerrar" },
    "Rouvrir": { en: "Reopen", es: "Reabrir" },
    "Aucune demande citoyenne dans cette catégorie.": { en: "No citizen request in this category.", es: "Ninguna solicitud ciudadana en esta categoría." },
    "CHARGE DE TRAVAIL EN UN COUP D'ŒIL": { en: "WORKLOAD AT A GLANCE", es: "CARGA DE TRABAJO DE UN VISTAZO" },
    "En attente de prise en charge": { en: "Waiting to be taken in charge", es: "A la espera de ser atendidas" },
    "dont {n} urgente(s)": { en: "including {n} urgent", es: "de las cuales {n} urgente(s)" },
    "aucune urgente": { en: "none urgent", es: "ninguna urgente" },
    "En cours de traitement": { en: "In progress", es: "En tramitación" },
    "Résolues": { en: "Resolved", es: "Resueltas" },
    "Plus ancienne en attente": { en: "Oldest waiting", es: "La más antigua en espera" },
    "Rien en attente": { en: "Nothing waiting", es: "Nada pendiente" },
    "depuis {age}": { en: "for {age}", es: "desde hace {age}" },
    "{n} min": { en: "{n} min", es: "{n} min" },
    "{h} h {m} min": { en: "{h} h {m} min", es: "{h} h {m} min" },
    "{d} j {h} h": { en: "{d} d {h} h", es: "{d} d {h} h" },
    "Voir les demandes en attente": { en: "Show pending requests", es: "Ver las solicitudes pendientes" },
    "{n} demande(s) en attente de prise en charge": { en: "{n} request(s) waiting to be taken in charge", es: "{n} solicitud(es) a la espera de ser atendidas" },

    // --- Pied de page ---
    "© 2026-2842 DIRECTION DU HAUT CONSEIL DE TERRA NOVA — 24H BY WEBCUP.": { en: "© 2026-2842 TERRA NOVA HIGH COUNCIL DIRECTORATE — 24H BY WEBCUP.", es: "© 2026-2842 DIRECCIÓN DEL ALTO CONSEJO DE TERRA NOVA — 24H BY WEBCUP." },
    "SERVICES URBAINS": { en: "CITY SERVICES", es: "SERVICIOS URBANOS" },
    "JOURNAL OFFICIEL": { en: "OFFICIAL JOURNAL", es: "BOLETÍN OFICIAL" },
    "PORTAIL HABITANT": { en: "RESIDENT PORTAL", es: "PORTAL DEL HABITANTE" },
    "SUPERVISION TECHNIQUE": { en: "TECHNICAL SUPERVISION", es: "SUPERVISIÓN TÉCNICA" },

    // --- Connexion et inscription (D01, D03) ---
    "ACCÈS CITOYEN TERRA NOVA": { en: "TERRA NOVA CITIZEN ACCESS", es: "ACCESO CIUDADANO TERRA NOVA" },
    "ACCÈS CITOYEN TERRA NOVA (D03)": { en: "TERRA NOVA CITIZEN ACCESS (D03)", es: "ACCESO CIUDADANO TERRA NOVA (D03)" },
    "CRÉATION COMPTE COLON (D01)": { en: "SETTLER ACCOUNT CREATION (D01)", es: "CREACIÓN DE CUENTA DE COLONO (D01)" },
    "CONNEXION (D03)": { en: "SIGN IN (D03)", es: "ACCESO (D03)" },
    "INSCRIPTION NOUVEAU COLON (D01)": { en: "NEW SETTLER REGISTRATION (D01)", es: "REGISTRO DE NUEVO COLONO (D01)" },
    "Matricule Citoyen ou Nom": { en: "Citizen ID or name", es: "Matrícula ciudadana o nombre" },
    "ex: TN-2842-8812 ou Kaelen Vance": { en: "e.g. TN-2842-8812 or Kaelen Vance", es: "ej.: TN-2842-8812 o Kaelen Vance" },
    "Empreinte Cryptographique / Code": { en: "Cryptographic print / code", es: "Huella criptográfica / código" },
    "S'authentifier sur le Portail": { en: "Sign in to the portal", es: "Autenticarse en el portal" },
    "Pas encore de matricule ?": { en: "No ID yet?", es: "¿Aún no tiene matrícula?" },
    "Créer un compte colon": { en: "Create a settler account", es: "Crear una cuenta de colono" },
    "Nom & Prénom du Colon": { en: "Settler's full name", es: "Nombre y apellidos del colono" },
    "ex: Thalia Kren": { en: "e.g. Thalia Kren", es: "ej.: Thalia Kren" },
    "Spécialisation / Profession": { en: "Specialisation / occupation", es: "Especialización / profesión" },
    "Ingénieur Systèmes Plasma": { en: "Plasma systems engineer", es: "Ingeniero de sistemas de plasma" },
    "Biologiste / Dôme Atmosphère": { en: "Biologist / Atmosphere Dome", es: "Biólogo / Cúpula Atmósfera" },
    "Pilote Navette Orbitale": { en: "Orbital shuttle pilot", es: "Piloto de lanzadera orbital" },
    "Médecin Biotech & Cryo": { en: "Biotech & cryo physician", es: "Médico biotech y crio" },
    "Sentinelle Sécurité Urbaine": { en: "Urban security sentinel", es: "Centinela de seguridad urbana" },
    "Citoyen Colon": { en: "Settler citizen", es: "Ciudadano colono" },
    "Dôme de Résidence Assigné": { en: "Assigned home dome", es: "Cúpula de residencia asignada" },
    "Dôme Alpha - Anneau 1 (Bio-Résidence)": { en: "Alpha Dome - Ring 1 (bio-residence)", es: "Cúpula Alfa - Anillo 1 (biorresidencia)" },
    "Dôme Bêta - Anneau 2 (Technocité)": { en: "Beta Dome - Ring 2 (tech city)", es: "Cúpula Beta - Anillo 2 (tecnociudad)" },
    "Anneau Orbital Zéro (Spatioport)": { en: "Orbital Ring Zero (spaceport)", es: "Anillo Orbital Cero (espaciopuerto)" },
    "Secteur Sud Extérieur (Fermes Hydro)": { en: "Outer South Sector (hydro farms)", es: "Sector Sur Exterior (granjas hidro)" },
    "Code de Sécurité d'Accès": { en: "Access security code", es: "Código de seguridad de acceso" },
    "Générer mon Matricule et Enregistrer (D01)": { en: "Generate my ID and register (D01)", es: "Generar mi matrícula y registrarme (D01)" }
};

let tnLang = 'fr';
try {
    const storedLang = localStorage.getItem('tn_lang');
    if (storedLang && TN_LANGS[storedLang]) tnLang = storedLang;
} catch (e) { }

const TN_TRANSLATED_ATTRS = ['placeholder', 'aria-label', 'title'];
const tnTextSources = new WeakMap();
const tnAttrSources = new WeakMap();

function tnNormalize(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function tnLookup(source) {
    if (tnLang === 'fr') return source;
    const entry = TN_DICT[source];
    return (entry && entry[tnLang]) || source;
}

// Traduit un texte français (avec paramètres {nom}) dans la langue courante
function t(source, params) {
    let out = tnLookup(source);
    if (params) {
        Object.keys(params).forEach(key => { out = out.split(`{${key}}`).join(params[key]); });
    }
    return out;
}

function tnLocale() {
    return TN_LOCALES[tnLang];
}

function tnTranslateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style, noscript, [data-no-i18n]')) return;

    if (!tnTextSources.has(node)) {
        if (!node.nodeValue.trim()) return;
        tnTextSources.set(node, node.nodeValue);
    }

    const source = tnTextSources.get(node);
    const key = tnNormalize(source);
    const translated = tnLookup(key);
    const next = translated === key
        ? source
        : source.match(/^\s*/)[0] + translated + source.match(/\s*$/)[0];
    if (node.nodeValue !== next) node.nodeValue = next;
}

function tnTranslateAttributes(el) {
    if (el.closest('[data-no-i18n]')) return;
    TN_TRANSLATED_ATTRS.forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const state = tnAttrSources.get(el) || {};
        const current = el.getAttribute(attr);
        // Une valeur différente de notre dernière traduction vient de l'application : c'est la nouvelle source
        if (!state[attr] || current !== state[attr].applied) {
            state[attr] = { source: current, applied: current };
            tnAttrSources.set(el, state);
        }
        const next = tnLookup(state[attr].source);
        if (current !== next) {
            state[attr].applied = next;
            el.setAttribute(attr, next);
        }
    });
}

function tnTranslateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
        tnTranslateTextNode(root);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) tnTranslateTextNode(walker.currentNode);

    tnTranslateAttributes(root);
    root.querySelectorAll('[placeholder], [aria-label], [title]').forEach(tnTranslateAttributes);
}

function setLanguage(lang) {
    if (!TN_LANGS[lang]) return;
    tnLang = lang;
    try { localStorage.setItem('tn_lang', lang); } catch (e) { }
    document.documentElement.lang = lang;

    // Les composants rendus par JavaScript se redessinent, puis toute la page est traduite
    document.dispatchEvent(new CustomEvent('tn:langchange', { detail: { lang } }));
    tnTranslateTree(document.body);
}

function initI18n() {
    document.documentElement.lang = tnLang;
    tnTranslateTree(document.body);

    // Tout contenu ajouté ensuite (tableaux, messages, cartes) est traduit à son insertion
    new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes') {
                tnTranslateAttributes(mutation.target);
                return;
            }
            mutation.addedNodes.forEach(tnTranslateTree);
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: TN_TRANSLATED_ATTRS
    });
}
