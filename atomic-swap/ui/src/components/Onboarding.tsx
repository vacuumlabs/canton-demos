import { SwapMark } from './Icons'

interface Props {
  online: boolean
  checking: boolean
  busy: boolean
  base: string
  onBaseChange: (base: string) => void
  onRetry: () => void
  onSetup: () => void
}

export function Onboarding({ online, checking, busy, base, onBaseChange, onRetry, onSetup }: Props) {
  return <main className="onboarding">
    <div className="onboarding-art"><SwapMark /></div>
    <h1>{online ? 'Ready to try your first swap?' : 'Connect to your demo network'}</h1>
    <p>{online ? 'We’ll create a demo wallet for Alice and Bob, with everything you need for a safe first exchange.' : 'Start the Canton sandbox, then reconnect to continue.'}</p>
    <button className="primary-button onboarding-button" disabled={checking || busy} onClick={online ? onSetup : onRetry}>
      {checking ? 'Connecting…' : busy ? 'Setting things up…' : online ? 'Set up demo wallet' : 'Try again'}
    </button>
    <details className="advanced-settings">
      <summary>Advanced settings</summary>
      <label htmlFor="api-base">Network address</label>
      <input id="api-base" value={base} onChange={(event) => onBaseChange(event.target.value)} placeholder="Use local proxy" />
      <p>Leave blank when using the local development server.</p>
    </details>
  </main>
}
