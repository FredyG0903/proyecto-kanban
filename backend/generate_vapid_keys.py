#!/usr/bin/env python
"""
Script para generar claves VAPID para notificaciones push.
Ejecutar: python generate_vapid_keys.py

Alternativa: Si este script no funciona, puedes usar:
- python -c "from cryptography.hazmat.primitives.asymmetric import ec; from cryptography.hazmat.backends import default_backend; import base64; private_key = ec.generate_private_key(ec.SECP256R1(), default_backend()); public_key = private_key.public_key(); pub_bytes = public_key.public_bytes(encoding=serialization.Encoding.X962, format=serialization.PublicFormat.UncompressedPoint); print('Public:', base64.urlsafe_b64encode(pub_bytes[1:33]).decode().rstrip('=')); print('Private:', base64.urlsafe_b64encode(private_key.private_bytes(encoding=serialization.Encoding.DER, format=serialization.PrivateFormat.PKCS8, encryption_algorithm=serialization.NoEncryption())).decode().rstrip('='))"
- O usar una herramienta online: https://web-push-codelab.glitch.me/
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def generate_vapid_keys():
    """Genera un par de claves VAPID (pública y privada) usando cryptography directamente"""
    try:
        # Generar clave privada
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        
        # Obtener clave pública
        public_key = private_key.public_key()
        
        # Serializar clave pública en formato sin comprimir (65 bytes: 0x04 + 32 bytes X + 32 bytes Y)
        public_key_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        
        # Para VAPID en el navegador, necesitamos el punto completo (65 bytes con prefijo 0x04)
        # Para pywebpush en el backend, también necesitamos el punto completo
        # NO eliminamos el prefijo 0x04, lo mantenemos
        public_key_raw = public_key_bytes
        
        # Serializar clave privada
        private_key_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Convertir a base64 URL-safe
        public_key_b64 = base64.urlsafe_b64encode(public_key_raw).decode('utf-8').rstrip('=')
        private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).decode('utf-8').rstrip('=')
        
        print("=" * 60)
        print("CLAVES VAPID GENERADAS")
        print("=" * 60)
        print("\nClave Pública (VAPID_PUBLIC_KEY):")
        print(public_key_b64)
        print("\nClave Privada (VAPID_PRIVATE_KEY):")
        print(private_key_b64)
        print("\n" + "=" * 60)
        print("INSTRUCCIONES:")
        print("=" * 60)
        print("\n1. Agrega estas claves a tu archivo .env o variables de entorno:")
        print(f"   VAPID_PUBLIC_KEY={public_key_b64}")
        print(f"   VAPID_PRIVATE_KEY={private_key_b64}")
        print("   VAPID_ADMIN_EMAIL=tu-email@ejemplo.com")
        print("\n2. O agrégalas directamente en settings.py (solo para desarrollo)")
        print("\n3. IMPORTANTE: Nunca compartas la clave privada públicamente")
        print("=" * 60)
        
    except ImportError as e:
        print("Error: cryptography no está instalado.")
        print("Instálalo con: pip install cryptography")
        print(f"Error detallado: {e}")
    except Exception as e:
        print(f"Error al generar claves: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_vapid_keys()

