import time
import random

def mongo_object_id():
    timestamp = hex(int(time.time()))[2:]
    rest = ''.join([random.choice('0123456789abcdef') for _ in range(16)])
    
    return (timestamp + rest).lower()

print(mongo_object_id())
