import { useState } from 'react';
import { ArrowRight, Clock, Heart, Lock, Sparkles, FileText, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import heroImage from '@/assets/hero-time-capsule.jpg';

const Index = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Heart,
      title: "Emotionally Intelligent",
      description: "Our AI understands the weight of your words and helps craft messages with empathy and care."
    },
    {
      icon: Lock,
      title: "Private & Secure",
      description: "Your memories are encrypted and stored safely. Only you control who sees them and when."
    },
    {
      icon: Clock,
      title: "Time-Locked Delivery",
      description: "Schedule messages for future birthdays, anniversaries, or meaningful moments yet to come."
    },
    {
      icon: Sparkles,
      title: "AI-Enhanced Writing",
      description: "Transform your thoughts into beautifully written messages that capture your authentic voice."
    }
  ];

  const capsuleTypes = [
    {
      title: "Legacy Letters",
      description: "Wisdom and life lessons for future generations",
      icon: FileText,
      gradient: "from-primary to-primary-glow"
    },
    {
      title: "Family Memories",
      description: "Precious moments to share with loved ones",
      icon: Heart,
      gradient: "from-accent to-accent-glow"
    },
    {
      title: "Future Self",
      description: "Messages to your future self on important milestones",
      icon: Clock,
      gradient: "from-secondary to-secondary-glow"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      {/* Floating elements for ambiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 left-1/3 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        {/* Hero Background Image */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-primary/10"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="animate-fade-up">
            <h1 className="text-hero font-serif mb-8">
              Preserve Your Voice
              <br />
              <span className="text-accent">for Tomorrow</span>
            </h1>
          </div>
          
          <div className="animate-fade-up animate-stagger-1">
            <p className="text-emotion max-w-3xl mx-auto mb-12">
              Create beautiful living heirloom messages that capture your thoughts, wisdom, and love. 
              Our AI helps you craft meaningful messages that will touch hearts across time.
            </p>
          </div>

          <div className="animate-fade-up animate-stagger-2 flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="btn-hero group" onClick={() => window.location.href = '/create'}>
              Start Your Living Heirloom
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="btn-gentle" onClick={() => window.location.href = '/capsules'}>
              View Examples
            </Button>
          </div>

          {/* Floating testimonial cards */}
          <div className="mt-20 animate-fade-up animate-stagger-3">
            <div className="relative">
              <Card className="card-memory absolute -left-40 top-0 w-80 hidden lg:block animate-float">
                <p className="text-sm italic mb-3">"This helped me write the perfect letter for my daughter's 18th birthday..."</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-glow rounded-full"></div>
                  <span className="text-sm font-medium">Sarah M.</span>
                </div>
              </Card>
              
              <Card className="card-memory absolute -right-40 top-12 w-80 hidden lg:block animate-float" style={{ animationDelay: '1s' }}>
                <p className="text-sm italic mb-3">"I created a living heirloom for my wedding anniversary. My husband was moved to tears."</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-glow rounded-full"></div>
                  <span className="text-sm font-medium">Michael R.</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">
              Crafted with <span className="text-primary">Emotional Intelligence</span>
            </h2>
            <p className="text-emotion max-w-2xl mx-auto">
              Every feature is designed to honor the sacred nature of your memories and messages.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index}
                  className={`card-memory text-center group cursor-pointer transition-all duration-500 ${
                    activeFeature === index ? 'glow-primary' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">
              Three Steps to <span className="text-accent">Forever</span>
            </h2>
          </div>

          <div className="space-y-16">
            {[
              {
                step: "01",
                title: "Share Your Story",
                description: "Our AI conducts a gentle interview, asking thoughtful questions to help you express what matters most.",
                icon: Users
              },
              {
                step: "02", 
                title: "AI Enhancement",
                description: "Your words are lovingly refined while preserving your authentic voice and emotional intent.",
                icon: Sparkles
              },
              {
                step: "03",
                title: "Time Lock & Deliver",
                description: "Schedule your message for the perfect moment - a birthday, anniversary, or any meaningful date.",
                icon: Calendar
              }
            ].map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row items-center gap-12">
                <div className={`flex-shrink-0 ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center">
                    <item.icon className="w-12 h-12 text-primary-foreground" />
                  </div>
                </div>
                
                <div className={`flex-1 text-center md:text-left ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                  <div className="text-6xl font-light text-primary/20 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-serif font-medium mb-4">{item.title}</h3>
                  <p className="text-emotion">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capsule Types */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">
              Choose Your <span className="text-secondary">Capsule Type</span>
            </h2>
            <p className="text-emotion max-w-2xl mx-auto">
              Each type is specially designed for different kinds of meaningful moments.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {capsuleTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <Card key={index} className="card-sacred group hover-lift">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${type.gradient} rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-serif font-medium mb-4 text-center">{type.title}</h3>
                  <p className="text-muted-foreground text-center leading-relaxed">{type.description}</p>
                  <Button className="w-full mt-8 btn-gentle" onClick={() => window.location.href = '/create'}>
                    Create This Heirloom
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="card-sacred">
            <h2 className="text-4xl md:text-5xl font-serif font-light mb-6">
              Your Story Deserves to <span className="text-primary">Live Forever</span>
            </h2>
            <p className="text-emotion mb-12 max-w-2xl mx-auto">
              Don't let precious memories fade away. Create your first living heirloom today and give the gift of your voice to tomorrow.
            </p>
            <Button size="lg" className="btn-hero group" onClick={() => window.location.href = '/create'}>
              Begin Your Journey
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-sm text-muted-foreground mt-6">
              Free to start • Private & secure • No subscription required
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;