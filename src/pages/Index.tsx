
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ThreeDBackground from "@/components/ThreeDBackground";
import Navigation from "@/components/Navigation";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const FallbackComponent = () => (
    <div className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 opacity-60" />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        <Suspense fallback={<FallbackComponent />}>
          <ThreeDBackground />
        </Suspense>
      </ErrorBoundary>
      <Navigation />

      <div className="flex-1 container max-w-6xl py-12 flex flex-col">
        <main className="flex-1 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Create professional invoices with ease
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-md mx-auto md:mx-0">
              Generate, share and track invoices in seconds. Perfect for freelancers and small businesses.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {isAuthenticated ? (
                <>
                  <Button size="lg" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/create-invoice")}>
                    Create New Invoice
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={() => navigate("/login")}>
                  Get Started
                </Button>
              )}
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto md:mx-0">
              {["Automatic Tax", "PDF Export", "Fast Creation", "Customizable"].map((feature, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary/10 text-primary">
                    {i + 1}
                  </div>
                  <span className="mt-2 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <div className="w-full md:w-[400px] flex-shrink-0 mt-8 md:mt-0 animate-float">
              <img 
                src="https://cdn.pixabay.com/photo/2018/04/06/15/26/invoice-3296202_1280.png" 
                alt="Invoice illustration" 
                className="h-40 w-auto mx-auto mb-6 drop-shadow-xl" 
              />
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">Sign up or log in to create and manage your invoices</p>
                <Button onClick={() => navigate('/signup')} size="lg" className="w-full">
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
