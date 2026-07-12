import useAuthStore from '../context/authStore.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function Settings() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isManager = user?.role === 'Fleet Manager';

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: isManager,
  });

  const { mutate: updateRole } = useMutation({
    mutationFn: async ({ id, role }) => {
      await api.patch(`/users/${id}/role`, { role });
    },
    onSuccess: () => {
      toast.success('Role updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed')
  });

  return (
    <div className="page" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      <h1 className="page-title" style={{ fontSize: 24, marginBottom: 16 }}>Settings & Users</h1>
      
      <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 8, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>My Profile</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: 'var(--text-muted)' }}>Name: <span style={{color: 'var(--text)'}}>{user?.name}</span></div>
          <div style={{ color: 'var(--text-muted)' }}>Email: <span style={{color: 'var(--text)'}}>{user?.email}</span></div>
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            Role: <span className="status-badge badge-on-trip" style={{marginLeft: 12, padding: '4px 12px'}}>{user?.role}</span>
          </div>
        </div>
      </div>

      {isManager && (
        <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>User Management (Admin View)</h2>
            <button 
              className="btn btn-primary"
              onClick={async () => {
                const loadingToast = toast.loading('Checking expiring licenses...');
                try {
                  const res = await api.post('/drivers/check-expiring-licenses');
                  toast.success(res.data.message, { id: loadingToast });
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Check failed', { id: loadingToast });
                }
              }}
            >
              Check Expiring Licenses
            </button>
          </div>
          {isLoading ? (
            <div className="table-msg">Loading users...</div>
          ) : (
            <div className="table-wrap" style={{ margin: 0, padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map(u => (
                    <tr key={u._id} className="table-row">
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select 
                          className="filter-select"
                          value={u.role}
                          onChange={(e) => updateRole({ id: u._id, role: e.target.value })}
                          disabled={u._id === user?._id}
                          style={{ margin: 0, padding: '4px 8px' }}
                        >
                          <option value="Fleet Manager">Fleet Manager</option>
                          <option value="Safety Officer">Safety Officer</option>
                          <option value="Financial Analyst">Financial Analyst</option>
                          <option value="Driver">Driver</option>
                        </select>
                      </td>
                      <td>
                        {u._id === user?._id ? (
                          <span style={{color: 'var(--text-muted)', fontSize: 12}}>Current User</span>
                        ) : (
                          <span style={{color: 'var(--green)', fontSize: 12}}>Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
