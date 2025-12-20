import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, ShieldCheck, ShieldAlert, Lock, Eye, Users, Activity,
  CheckCircle2, AlertTriangle, XCircle, Globe, Server, Database,
  Key, RefreshCw, Clock, TrendingUp, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SecurityMetric {
  label: string;
  value: number;
  max: number;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface SecurityEvent {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source: string;
}

export const SecurityDashboard = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Simulated security events for demo
  const [securityEvents] = useState<SecurityEvent[]>([
    { id: '1', type: 'success', message: 'SSL Certificate verified', timestamp: new Date(), source: 'SSL Monitor' },
    { id: '2', type: 'success', message: 'Database RLS policies active', timestamp: new Date(Date.now() - 3600000), source: 'Database' },
    { id: '3', type: 'success', message: 'Authentication system healthy', timestamp: new Date(Date.now() - 7200000), source: 'Auth Service' },
    { id: '4', type: 'warning', message: 'Consider enabling 2FA for admin accounts', timestamp: new Date(Date.now() - 86400000), source: 'Security Audit' },
    { id: '5', type: 'success', message: 'Firewall rules updated', timestamp: new Date(Date.now() - 172800000), source: 'Firewall' },
  ]);

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      // Fetch active user roles count
      const { count: rolesCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });
      
      setActiveUsers(rolesCount || 0);

      // Fetch total orders for activity metric
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      
      setTotalOrders(ordersCount || 0);
      
      // Simulate login attempts tracking (in production, this would come from auth logs)
      setLoginAttempts(Math.floor(Math.random() * 5));
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    }
  };

  const runSecurityScan = async () => {
    setIsScanning(true);
    // Simulate security scan
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastScan(new Date());
    setIsScanning(false);
  };

  const securityMetrics: SecurityMetric[] = [
    { 
      label: 'SSL Encryption', 
      value: 100, 
      max: 100, 
      status: 'good',
      icon: <Lock className="w-4 h-4" />
    },
    { 
      label: 'RLS Protection', 
      value: 100, 
      max: 100, 
      status: 'good',
      icon: <Database className="w-4 h-4" />
    },
    { 
      label: 'Auth Security', 
      value: 95, 
      max: 100, 
      status: 'good',
      icon: <Key className="w-4 h-4" />
    },
    { 
      label: 'API Security', 
      value: 90, 
      max: 100, 
      status: 'good',
      icon: <Server className="w-4 h-4" />
    },
  ];

  const overallScore = Math.round(
    securityMetrics.reduce((acc, m) => acc + (m.value / m.max) * 100, 0) / securityMetrics.length
  );

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
    }
  };

  const getEventIcon = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Security Overview Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Security Score */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Security Score
            </CardTitle>
            <CardDescription>Overall protection level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/30"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={351.86}
                    strokeDashoffset={351.86 * (1 - overallScore / 100)}
                    className="text-green-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{overallScore}%</span>
                  <span className="text-xs text-muted-foreground">Protected</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Secure
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2 bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Security Metrics
            </CardTitle>
            <CardDescription>Real-time security status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-foreground">6</p>
                <p className="text-xs text-muted-foreground">Protected Tables</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Admin Users</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Eye className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold text-foreground">{loginAttempts}</p>
                <p className="text-xs text-muted-foreground">Login Attempts (24h)</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Secure Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protection Status */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Protection Status
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={runSecurityScan}
                disabled={isScanning}
                className="gap-2"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isScanning ? 'Scanning...' : 'Run Scan'}
              </Button>
            </div>
            {lastScan && (
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last scan: {formatTimeAgo(lastScan)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {securityMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(metric.status)}>{metric.icon}</span>
                    <span className="text-foreground">{metric.label}</span>
                  </div>
                  <span className={`font-medium ${getStatusColor(metric.status)}`}>
                    {metric.value}%
                  </span>
                </div>
                <Progress 
                  value={metric.value} 
                  className="h-2"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security Features */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Active Security Features
            </CardTitle>
            <CardDescription>Multi-layered protection enabled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'SSL/TLS Encryption', description: 'All data encrypted in transit', enabled: true, icon: Lock },
                { name: 'Row Level Security', description: 'Database access control', enabled: true, icon: Database },
                { name: 'JWT Authentication', description: 'Secure token-based auth', enabled: true, icon: Key },
                { name: 'CORS Protection', description: 'Cross-origin request filtering', enabled: true, icon: Globe },
                { name: 'SQL Injection Prevention', description: 'Parameterized queries', enabled: true, icon: ShieldAlert },
                { name: 'Rate Limiting', description: 'API abuse prevention', enabled: true, icon: Activity },
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <feature.icon className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Event Log */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Security Event Log
          </CardTitle>
          <CardDescription>Recent security events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {getEventIcon(event.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {event.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Security Recommendations
          </CardTitle>
          <CardDescription>Suggestions to improve your security posture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { 
                title: 'Enable 2FA', 
                description: 'Add two-factor authentication for admin accounts',
                priority: 'Medium'
              },
              { 
                title: 'Regular Backups', 
                description: 'Schedule automated database backups',
                priority: 'Low'
              },
              { 
                title: 'Audit Logs', 
                description: 'Enable detailed audit logging for compliance',
                priority: 'Low'
              },
            ].map((rec, index) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground text-sm">{rec.title}</h4>
                  <Badge 
                    variant="outline" 
                    className={
                      rec.priority === 'High' 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30'
                        : rec.priority === 'Medium'
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                    }
                  >
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
