import React from 'react';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-nova-dark text-nova-text">
      <div className="text-center p-8 bg-nova-card border border-nova-border rounded-2xl shadow-2xl max-w-md">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-nova-primary to-nova-accent mb-2">
          ChatNova
        </h1>
        <p className="text-nova-muted text-sm font-medium">
          Connect. Communicate. Share.
        </p>
      </div>
    </div>
  );
}
