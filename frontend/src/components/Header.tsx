import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
              <span className="text-lg font-bold text-background">iu</span>
            </div>
            <span className="text-xl font-bold text-foreground">Invoicingu</span>
          </Link>
          
          <nav className="flex items-center gap-8">
            <Link 
              to="/pricing" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link 
              // href="#" 
              to="/profile" 

              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Profile
            </Link>
            <a 
              href="#" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              invoicingu.service
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
