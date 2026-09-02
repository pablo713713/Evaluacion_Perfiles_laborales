import os
val = os.environ.get('PGPASSWORD', 'no encontrado')
print('PGPASSWORD:', val)
val2 = os.environ.get('PGCLIENTENCODING', 'no encontrado')
print('PGCLIENTENCODING:', val2)