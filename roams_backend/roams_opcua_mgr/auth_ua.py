from opcua import Client
from colorama import Fore, Style
import logging

logger = logging.getLogger(__name__)

def authenticate_client(client: Client, username: str = None, password: str = None):
    """
    Authenticate the OPC UA client.
    - If username and password are provided, use them.
    - If authentication is anonymous, proceed without credentials.
    """
    try:
        if username and password:
            client.set_user(username)
            client.set_password(password)
            logger.info(f"{Fore.CYAN}🔐 Using Username/Password Authentication{Style.RESET_ALL}")
            return "Username/Password Authentication"
        
        logger.info(f"{Fore.GREEN}✅ Using Anonymous Authentication{Style.RESET_ALL}")
        return "Anonymous Authentication"
    
    except Exception as e:
        logger.error(f"{Fore.RED}❌ Authentication failed: {e}{Style.RESET_ALL}")
        return "Authentication Error"
