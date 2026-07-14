import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="card-sacred max-w-md text-center">
        <p className="eyebrow mb-4">Page not found</p>
        <h1 className="text-display text-3xl">This page was never written.</h1>
        <p className="text-emotion mt-3">
          The address <span className="font-sans text-sm">{location.pathname}</span> doesn't lead
          anywhere.
        </p>
        <Link to="/" className="btn-hero mt-8 inline-flex">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
