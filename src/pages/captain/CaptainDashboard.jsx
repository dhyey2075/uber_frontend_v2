import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CaptainLanding from '../../components/captain/CaptainLanding';

function CaptainDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('captain_token');
    if (!token || token === 'null' || token === 'undefined') {
      navigate('/captain/signin', { replace: true });
    }
  }, [navigate]);

  return (
    <div>
      <CaptainLanding />
    </div>
  );
}

export default CaptainDashboard;
