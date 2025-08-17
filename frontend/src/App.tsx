import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo-client.ts';
import VoiceAuth from './components/VoiceAuth';
import RecordVoice from './components/RecordVoice';
import AuthenticateVoice from './components/AuthenticateVoice';
import Web3Auth from './components/Web3Auth';
import RegistrationForm from './components/RegistrationForm';
import VoiceProtectionChecker from './components/VoiceProtectionChecker';
import VoiceRegistrations from './components/VoiceRegistrations.tsx';
import WalletDemo from './components/WalletDemo';
import AuthenticationLogs from './components/AuthenticationLogs';
import './App.css';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <Router>
        <div className="App">
          <nav className="navigation py-[10em]">
            <div className="nav-left">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/register" className="nav-link">Register</Link>
              <Link to="/wallet-demo" className="nav-link">Demo</Link>
            </div>
            <div className="nav-right">
              <DynamicWidget />
            </div>
          </nav>
          
          <Routes>
            <Route path="/" element={<VoiceAuth />} />
            <Route path="/web3-auth" element={<Web3Auth />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route path="/authenticate" element={<AuthenticateVoice />} />
            <Route path="/record" element={<RecordVoice />} />
            <Route path="/protection-checker" element={<VoiceProtectionChecker />} />
            <Route path="/registrations" element={<VoiceRegistrations />} />
            <Route path="/auth-logs" element={<AuthenticationLogs walletAddress="0x19E95b026731974B7c1feD9eb3c3113fBDD80464" />} />
            <Route path="/wallet-demo" element={<WalletDemo />} />
          </Routes>
        </div>
      </Router>
    </ApolloProvider>
  );
}

export default App;
