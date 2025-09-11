import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share2, RefreshCw, Wand2, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GenerationPage = () => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [toneAdjustment, setToneAdjustment] = useState([7]);
  const [lengthPreference, setLengthPreference] = useState<'short' | 'medium' | 'long'>('medium');
  const [versions, setVersions] = useState<string[]>([]);
  const [tone, setTone] = useState<'gentle' | 'warm' | 'thoughtful' | 'inspiring'>('warm');

  const titles = [
    { title: 'Heartfelt & Personal', tone: 'warm' },
    { title: 'Wise & Reflective', tone: 'thoughtful' },
    { title: 'Poetic & Inspirational', tone: 'inspiring' },
  ] as const;
  const currentVersion = versions[selectedVersion] || '';

  useEffect(() => {
    const loadAndGenerate = async () => {
      setIsGenerating(true);
      let answers: Record<string, string> | null = null;
      try {
        const raw = localStorage.getItem('tc_answers');
        if (raw) answers = JSON.parse(raw);
      } catch {}

      try {
        const resp = await fetch('http://localhost:3001/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: answers || {},
            tone,
            length: lengthPreference,
            n: 3,
          }),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const v: string[] = data?.versions || [];
        setVersions(v.length ? v : ['No content generated. Try again.']);
      } catch (e) {
        setVersions(['Generation failed. Please ensure the local AI server is running.']);
        // eslint-disable-next-line no-console
        console.error('Generation error', e);
      } finally {
        setIsGenerating(false);
      }
    };
    loadAndGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const raw = localStorage.getItem('tc_answers');
      const answers = raw ? JSON.parse(raw) : {};
      const resp = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          tone,
          length: lengthPreference,
          n: 3,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setVersions(data?.versions || []);
      setSelectedVersion(0);
    } catch (e) {
      setVersions(['Generation failed. Please ensure the local AI server is running.']);
      // eslint-disable-next-line no-console
      console.error('Regenerate error', e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6 flex items-center justify-center">
        <Card className="card-sacred max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-glow rounded-3xl flex items-center justify-center animate-pulse-soft">
              <Wand2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-serif font-medium mb-4">Crafting Your Message</h2>
            <p className="text-emotion mb-8">
              Our AI is thoughtfully weaving your words into something beautiful. 
              This process is guided by emotional intelligence and deep respect for your story.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="shimmer h-4 rounded"></div>
            <div className="shimmer h-4 rounded w-5/6"></div>
            <div className="shimmer h-4 rounded w-4/6"></div>
            <div className="shimmer h-4 rounded w-5/6"></div>
          </div>

          <div className="mt-12 text-sm text-muted-foreground">
            Creating emotional resonance... This may take a moment.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" className="btn-gentle">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interview
          </Button>
          
          <div className="flex gap-4">
            <Button variant="outline" className="btn-gentle">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button className="btn-hero">
              <Download className="w-4 h-4 mr-2" />
              Save Capsule
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Version Selector */}
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-medium mb-4">Choose Your Voice</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {titles.map((info, index) => (
                  <Card 
                    key={index}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedVersion === index 
                        ? 'card-sacred border-primary glow-primary' 
                        : 'card-memory hover-lift'
                    }`}
                    onClick={() => setSelectedVersion(index)}
                  >
                    <h3 className="font-medium mb-2">{info.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {info.tone === 'warm' && 'Personal and intimate tone'}
                      {info.tone === 'thoughtful' && 'Reflective and wise approach'}
                      {info.tone === 'inspiring' && 'Poetic and uplifting language'}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Generated Content */}
            <Card className="card-preview">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-line font-light leading-relaxed text-lg">
                  {currentVersion}
                </div>
              </div>
            </Card>
          </div>

          {/* Customization Panel */}
          <div className="space-y-6">
            <Card className="card-memory">
              <h3 className="text-xl font-medium mb-6">Customize Your Message</h3>
              
              <div className="space-y-8">
                {/* Tone Adjustment */}
                <div>
                  <label className="block text-sm font-medium mb-3">Emotional Tone</label>
                  <div className="space-y-2">
                    <Slider
                      value={toneAdjustment}
                      onValueChange={(v) => {
                        setToneAdjustment(v);
                        const level = v[0];
                        if (level <= 3) setTone('gentle');
                        else if (level <= 6) setTone('warm');
                        else if (level <= 8) setTone('thoughtful');
                        else setTone('inspiring');
                      }}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Gentle</span>
                      <span>Passionate</span>
                    </div>
                  </div>
                </div>

                {/* Length Preference */}
                <div>
                  <label className="block text-sm font-medium mb-3">Message Length</label>
                  <Select value={lengthPreference} onValueChange={(v) => setLengthPreference(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Concise & Powerful</SelectItem>
                      <SelectItem value="medium">Thoughtful & Complete</SelectItem>
                      <SelectItem value="long">Detailed & Immersive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Regenerate Button */}
                <Button 
                  variant="outline" 
                  className="w-full btn-gentle"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate with Settings
                </Button>
              </div>
            </Card>

            {/* Delivery Options */}
            <Card className="card-memory">
              <h3 className="text-xl font-medium mb-6">Delivery Options</h3>
              
              <div className="space-y-4">
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Clock className="w-4 h-4 mr-3" />
                  Schedule for Future
                </Button>
                
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Lock className="w-4 h-4 mr-3" />
                  Time Lock Until Date
                </Button>
                
                <Button variant="outline" className="w-full btn-gentle justify-start">
                  <Share2 className="w-4 h-4 mr-3" />
                  Share Now
                </Button>
              </div>
            </Card>

            {/* Preview Stats */}
            <Card className="card-memory">
              <h3 className="text-lg font-medium mb-4">Message Details</h3>
                <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Word Count</span>
                  <span>{currentVersion.split(' ').filter(Boolean).length} words</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reading Time</span>
                  <span>~{Math.ceil(currentVersion.split(' ').filter(Boolean).length / 200)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emotional Tone</span>
                  <span className="capitalize">{tone}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerationPage;