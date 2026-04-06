to discover tables associated with user: 

select
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (
    (ccu.table_schema = 'auth' and ccu.table_name = 'users' and ccu.column_name = 'id')
    or
    (ccu.table_schema = 'public' and ccu.table_name = 'profiles' and ccu.column_name = 'id')
  )
order by tc.table_schema, tc.table_name, kcu.column_name;