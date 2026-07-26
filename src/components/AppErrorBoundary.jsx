import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ScholarPath crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-crash">
        <div className="app-crash-card" role="alert">
          <img src="/scholarpath-logo-dark.svg" alt="ScholarPath" />
          <h1>ScholarPath could not start</h1>
          <p>{this.state.error.message || 'Something went wrong while loading the app.'}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </main>
    );
  }
}
