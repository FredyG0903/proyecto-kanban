#!/usr/bin/env python
"""
Script simplificado para generar claves VAPID válidas.
Este script genera claves que funcionan tanto con pywebpush como con el navegador.
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def generate_vapid_keys():
    """Genera claves VAPID válidas para P-256"""
    try:
        # Generar clave privada P-256
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        
        # Obtener clave pública
        public_key = private_key.public_key()
        
        # Obtener los números X e Y de la clave pública
        public_numbers = public_key.public_numbers()
        x = public_numbers.x
        y = public_numbers.y
        
        # Convertir X e Y a bytes (32 bytes cada uno)
        x_bytes = x.to_bytes(32, byteorder='big')
        y_bytes = y.to_bytes(32, byteorder='big')
        
        # Crear el punto completo: 0x04 + X (32 bytes) + Y (32 bytes) = 65 bytes
        public_key_raw = bytes([0x04]) + x_bytes + y_bytes
        
        # Serializar clave privada en formato DER/PKCS8
        private_key_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Convertir a base64 URL-safe (sin padding)
        public_key_b64 = base64.urlsafe_b64encode(public_key_raw).decode('utf-8').rstrip('=')
        private_key_b64 = base64.urlsafe_b64encode(private_key_bytes).decode('utf-8').rstrip('=')
        
        # Validar longitudes
        print("=" * 60)
        print("CLAVES VAPID GENERADAS")
        print("=" * 60)
        print(f"\nClave Pública (VAPID_PUBLIC_KEY):")
        print(f"  Longitud: {len(public_key_b64)} caracteres")
        print(f"  Bytes decodificados: {len(public_key_raw)} bytes")
        print(f"  Primer byte: 0x{public_key_raw[0]:02x}")
        print(f"  Valor: {public_key_b64}")
        print(f"\nClave Privada (VAPID_PRIVATE_KEY):")
        print(f"  Longitud: {len(private_key_b64)} caracteres")
        print(f"  Valor: {private_key_b64}")
        print("\n" + "=" * 60)
        print("INSTRUCCIONES:")
        print("=" * 60)
        print("\n1. Agrega estas claves a settings.py:")
        print(f"   VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', '{public_key_b64}')")
        print(f"   VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', '{private_key_b64}')")
        print("\n2. Reinicia el servidor backend")
        print("\n3. Recarga el frontend y verifica en la consola")
        print("=" * 60)
        
        return public_key_b64, private_key_b64
        
    except Exception as e:
        print(f"Error al generar claves: {e}")
        import traceback
        traceback.print_exc()
        return None, None

if __name__ == "__main__":
    generate_vapid_keys()




