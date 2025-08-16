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
import './App.css';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <Router>
        <div className="App">
          <nav className="navigation">
            <div className="nav-left">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/register" className="nav-link">Register</Link>
              <Link to="/authenticate" className="nav-link">Authenticate</Link>
              <Link to="/registrations" className="nav-link"> Registrations</Link>
              <Link to="/wallet-demo" className="nav-link">Wallet Demo</Link>
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
            <Route path="/wallet-demo" element={<WalletDemo />} />
          </Routes>
        </div>
      </Router>
    </ApolloProvider>
  );
}

export default App;
