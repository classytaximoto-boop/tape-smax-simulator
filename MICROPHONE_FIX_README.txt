MICROPHONE FIX — TAPE SMAX SIMULATOR

Corrections:
- Suppression de la demande getUserMedia(audio) automatique au splash.
- Suppression de la demande getUserMedia(video) automatique au splash.
- Le bouton MICRO est le seul point qui ouvre réellement le flux micro.
- Diagnostic plus précis de NotReadableError et AbortError.
- Si les sources Android sont présentes, RECORD_AUDIO est vérifié et le refus
  automatique d'une ancienne PermissionRequest est supprimé.

Test recommandé:
1. Construire une nouvelle APK.
2. Désinstaller l'ancienne APK.
3. Installer la nouvelle APK.
4. Autoriser Microphone.
5. Ouvrir Animation coupe moteur et activer MICRO.

L'algorithme de détection moteur n'a pas été réécrit.
