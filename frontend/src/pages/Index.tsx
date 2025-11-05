import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import HowItWorksSection from "@/components/HowItWorksSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Create & Send Invoices Fast
          </h1>
          <p className="mb-10 text-xl text-muted-foreground md:text-2xl">
            Manage clients, services, templates & invoices – all in one place.
          </p>
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-semibold"
            // onClick={() => navigate(token ? "/invoice" : "/auth/login")}
          >
            Get Started Free
          </Button>
        </section>

        {/* E-Invoice Announcement */}
        <section className="container mx-auto px-4 pb-20">
          <div className="mx-auto max-w-4xl rounded-2xl border-2 border-primary/20 bg-success-light/30 p-8">
            <div className="mb-4 flex items-start gap-3">
              <Badge className="bg-primary text-primary-foreground">New</Badge>
              <h2 className="text-2xl font-bold text-foreground">
                Hybrid E-Invoice (PDF/A-3 + XML) now supported
              </h2>
            </div>
            <p className="mb-6 text-muted-foreground">
              ZUGFeRD/Factur-X compatible. Produce a readable PDF that includes EN 16931 XML
              for automated processing.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1 font-semibold text-foreground">Jan 1, 2025</p>
                <p className="text-sm text-muted-foreground">
                  All businesses must be able to receive e-invoices.
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-foreground">Jan 1, 2027</p>
                <p className="text-sm text-muted-foreground">
                  Issuing mandatory for turnover ≥ €800k.
                </p>
              </div>
              <div>
                <p className="mb-1 font-semibold text-foreground">Jan 1, 2028</p>
                <p className="text-sm text-muted-foreground">
                  Issuing mandatory for all remaining businesses.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (video + accordion) */}
        <HowItWorksSection />
      </main>
    </div>
  );
};

export default Index;
