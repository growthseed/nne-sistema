import { serveAdminUserManagement } from '../_shared/admin-user-management.ts'

Deno.serve(req => serveAdminUserManagement(req, 'admin-manage-user'))
