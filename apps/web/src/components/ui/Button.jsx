import './Button.css';

function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export default Button;
