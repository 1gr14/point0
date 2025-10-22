import type { ErrorComponentType, LoaderComponentType } from '../../core/index.js'

// ────────────────────────────────────────────────
// Shared base styles
// ────────────────────────────────────────────────
const baseContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #1e1e2f, #2d2d44)',
  color: '#f5f5f7',
  fontFamily: `'Inter', system-ui, sans-serif`,
  textAlign: 'center',
  padding: '2rem',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  padding: '2rem 3rem',
  maxWidth: '800px',
  width: '100%',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
}

const titleStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: '1rem',
  color: '#ff6b81',
}

const messageStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: '#f0f0f0',
  marginBottom: '0.5rem',
}

const metaStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#aaa',
  marginTop: '1rem',
}

const preStyle: React.CSSProperties = {
  textAlign: 'left',
  background: 'rgba(0,0,0,0.3)',
  padding: '1rem',
  borderRadius: '8px',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  overflowX: 'auto',
  color: '#ccc',
  marginTop: '1.5rem',
}

// ────────────────────────────────────────────────
// Error Component (single unified)
// ────────────────────────────────────────────────
export const DefaultErrorComponent: ErrorComponentType = ({ type, error, location }) => {
  const data = error.toJSON()

  // adjust layout based on type
  const containerStyle: React.CSSProperties = {
    ...baseContainer,
    minHeight: type === 'app' ? '100vh' : type === 'page' ? '80vh' : 'auto',
    padding: type === 'component' ? '1rem' : '2rem',
    background:
      type === 'component'
        ? 'transparent'
        : type === 'page'
          ? 'linear-gradient(135deg, #1b1b2b, #2c2c40)'
          : 'linear-gradient(135deg, #1e1e2f, #2d2d44)',
  }

  const localCardStyle: React.CSSProperties = {
    ...cardStyle,
    boxShadow: type === 'component' ? 'none' : cardStyle.boxShadow,
    padding: type === 'component' ? '1rem 1.5rem' : cardStyle.padding,
    borderRadius: type === 'component' ? '8px' : cardStyle.borderRadius,
  }

  return (
    <div style={containerStyle}>
      <div style={localCardStyle}>
        <h1 style={titleStyle}>💥 Error {error.httpStatus || ''}</h1>
        <p style={messageStyle}>{data.message}</p>
        {!!error.meta && <pre style={metaStyle}>{JSON.stringify(error.meta, null, 2)}</pre>}
        {!!error.stack && <pre style={preStyle}>{error.stack}</pre>}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────
// Loader Component (single unified)
// ────────────────────────────────────────────────
const spinnerAnimation = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`

export const DefaultLoaderComponent: LoaderComponentType = ({ type }) => {
  // dynamic sizing per type
  const isApp = type === 'app'
  const isPage = type === 'page'
  const isComponent = type === 'component'

  const containerStyle: React.CSSProperties = {
    ...baseContainer,
    minHeight: isApp ? '100vh' : isPage ? '80vh' : 'auto',
    background: isComponent
      ? 'transparent'
      : isPage
        ? 'linear-gradient(135deg, #141421, #1f1f33)'
        : 'linear-gradient(135deg, #101018, #1b1b2b)',
    padding: isComponent ? '0.5rem' : '2rem',
  }

  const spinnerSize = isApp ? 64 : isPage ? 48 : 24
  const spinnerBorder = isComponent ? 3 : 6

  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `${spinnerBorder}px solid rgba(255,255,255,0.2)`,
    borderTopColor: '#61dafb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }

  const textStyle: React.CSSProperties = {
    marginTop: isComponent ? '0.5rem' : '1.5rem',
    color: '#aaa',
    fontSize: isComponent ? '0.8rem' : '1rem',
  }

  return (
    <>
      <style>{spinnerAnimation}</style>
      <div style={containerStyle}>
        <div style={spinnerStyle}></div>
        {!isComponent && <p style={textStyle}>Loading...</p>}
      </div>
    </>
  )
}
