"""
Script para verificar que Redis está configurado correctamente.
Ejecutar: python verificar_redis.py
"""
import os
import sys

def verificar_redis():
    print("=" * 60)
    print("VERIFICACIÓN DE REDIS")
    print("=" * 60)
    
    # Verificar si redis está instalado
    try:
        import redis
        print("✅ Módulo 'redis' está instalado")
    except ImportError:
        print("❌ Módulo 'redis' NO está instalado")
        print("   Instala con: pip install redis")
        return False
    
    # Verificar si channels_redis está instalado
    try:
        import channels_redis
        print("✅ Módulo 'channels_redis' está instalado")
    except ImportError:
        print("❌ Módulo 'channels_redis' NO está instalado")
        print("   Instala con: pip install channels-redis")
        return False
    
    # Intentar conectar a Redis
    redis_host = os.getenv('REDIS_HOST', '127.0.0.1')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    
    print(f"\n🔍 Intentando conectar a Redis en {redis_host}:{redis_port}...")
    
    try:
        r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        r.ping()
        print("✅ Conexión a Redis exitosa!")
        
        # Información adicional
        info = r.info()
        print(f"   Versión de Redis: {info.get('redis_version', 'N/A')}")
        print(f"   Uptime: {info.get('uptime_in_seconds', 0)} segundos")
        print(f"   Memoria usada: {info.get('used_memory_human', 'N/A')}")
        
        return True
    except redis.ConnectionError as e:
        print(f"❌ No se pudo conectar a Redis: {e}")
        print("\n💡 Posibles soluciones:")
        print("   1. Verifica que Redis está corriendo:")
        print("      - Windows: Verifica que Memurai está iniciado")
        print("      - WSL/Linux: sudo service redis-server start")
        print("      - Docker: docker start redis")
        print("   2. Verifica el host y puerto:")
        print(f"      Host: {redis_host}")
        print(f"      Puerto: {redis_port}")
        print("   3. Verifica que el firewall permite conexiones en el puerto 6379")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def verificar_configuracion_django():
    print("\n" + "=" * 60)
    print("VERIFICACIÓN DE CONFIGURACIÓN DJANGO")
    print("=" * 60)
    
    # Configurar Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    
    try:
        import django
        django.setup()
        
        from django.conf import settings
        
        use_redis = os.getenv('USE_REDIS', 'False').lower() == 'true'
        
        if use_redis:
            print("✅ USE_REDIS está configurado como True")
            print(f"   REDIS_HOST: {os.getenv('REDIS_HOST', '127.0.0.1')}")
            print(f"   REDIS_PORT: {os.getenv('REDIS_PORT', '6379')}")
        else:
            print("⚠️ USE_REDIS está configurado como False")
            print("   Para usar Redis, configura USE_REDIS=True en .env")
            print("   O cambia USE_REDIS = True en settings.py")
        
        # Verificar CHANNEL_LAYERS
        if hasattr(settings, 'CHANNEL_LAYERS'):
            backend = settings.CHANNEL_LAYERS['default']['BACKEND']
            if 'RedisChannelLayer' in backend:
                print(f"✅ Channel Layer configurado: {backend}")
            else:
                print(f"⚠️ Channel Layer configurado: {backend}")
                print("   Usando InMemoryChannelLayer (solo desarrollo)")
        else:
            print("❌ CHANNEL_LAYERS no está configurado")
            
    except Exception as e:
        print(f"❌ Error al verificar configuración Django: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    redis_ok = verificar_redis()
    verificar_configuracion_django()
    
    print("\n" + "=" * 60)
    if redis_ok:
        print("✅ Redis está listo para usar!")
        print("\nPara activar Redis en Django:")
        print("1. Crea un archivo .env en kanban-academico/backend/")
        print("2. Agrega: USE_REDIS=True")
        print("3. Reinicia el servidor Django")
    else:
        print("⚠️ Redis no está disponible")
        print("   Revisa INSTALAR_REDIS.md para instrucciones de instalación")
    print("=" * 60)

