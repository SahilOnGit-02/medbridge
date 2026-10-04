# Emergency access

Source: `app/api/emergency.py`, `app/models/emergency.py`, `frontend/src/components/EmergencyAccess.jsx`.

An authorized clinician starts `POST /emergency-access` for a connected patient and supplies a reason. Sessions last 30 minutes, can be restored in the interface, and can be ended explicitly. The emergency read endpoint returns the emergency-profile subset rather than unrestricted normal clinical history. Expired or ended sessions cannot be used.

Creation, viewing and ending are audited. The UI requires leaving the active emergency session before returning to normal records. Emergency access can operate without normal consent within its implemented subset; it does not grant PDF report access or change sharing scopes.

Review the actual emergency schemas and endpoints in [API documentation](API-DOCUMENTATION.md). Clinical governance and formal emergency access policy remain outside the validated capstone scope.
