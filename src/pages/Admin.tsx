import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, Phone, Mail, MapPin, Calendar, ExternalLink, LogOut, Loader2, 
  CreditCard, Smartphone, Banknote, Search, Filter, Trash2, X 
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderItem {
  name?: string;
  product_name?: string;
  price?: number;
  product_price?: number;
  quantity: number;
  image?: string;
  product_image?: string;
}

const normalizeOrderItem = (item: OrderItem) => ({
  name: item.name || item.product_name || 'Unknown',
  price: item.price || item.product_price || 0,
  quantity: item.quantity || 1,
  image: item.image || item.product_image
});

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
  transaction_id?: string;
}

const ORDER_STATUSES = [
  { value: 'all', label: 'All Orders', color: 'bg-muted text-muted-foreground' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const PAYMENT_FILTERS = [
  { value: 'all', label: 'All Payments' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
];

const Admin = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const navigate = useNavigate();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
        setAuthChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setAuthChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      
      const channel = supabase
        .channel('orders-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
      
      if (data && !error) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        toast.error("You don't have admin access");
      }
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedOrders = data.map(order => ({
        ...order,
        items: (order.items as unknown as OrderItem[]) || []
      }));
      setOrders(formattedOrders);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error("Order not found");

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-order-status-email', {
          body: {
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            orderId: order.id,
            newStatus,
            items: order.items.map(item => {
              const normalized = normalizeOrderItem(item);
              return {
                name: normalized.name,
                price: normalized.price,
                quantity: normalized.quantity
              };
            }),
            totalAmount: order.total_amount,
            paymentMethod: order.payment_method || 'cod',
            transactionId: order.transaction_id || null
          }
        });

        if (emailError) {
          toast.success(`Status updated to ${newStatus} (email notification failed)`);
        } else {
          toast.success(`Status updated to ${newStatus} - Email sent`);
        }
      } catch (emailErr) {
        toast.success(`Status updated to ${newStatus} (email notification failed)`);
      }
      
      fetchOrders();
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteOrder = async (order: Order) => {
    setDeletingOrder(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;
      
      toast.success(`Order #${order.id.slice(0, 8)} deleted successfully`);
      fetchOrders();
    } catch (error: any) {
      toast.error(`Failed to delete order: ${error.message}`);
    } finally {
      setDeletingOrder(null);
      setOrderToDelete(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status);
    return statusObj?.color || 'bg-muted text-muted-foreground';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const openWhatsApp = (order: Order) => {
    const itemsList = order.items
      .map((item) => {
        const normalized = normalizeOrderItem(item);
        return `• ${normalized.name} x${normalized.quantity} - ৳${normalized.price.toLocaleString()}`;
      })
      .join('\n');

    const message = `Hi ${order.customer_name}, regarding your order #${order.id.slice(0, 8)}:\n\n${itemsList}\n\nTotal: ৳${order.total_amount.toLocaleString()}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`, '_blank');
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower) ||
      order.customer_phone.includes(searchQuery) ||
      order.id.toLowerCase().includes(searchLower) ||
      order.transaction_id?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    // Payment filter
    const matchesPayment = paymentFilter === "all" || 
      (order.payment_method || 'cod') === paymentFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== "all") {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      if (dateFilter === "today") {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= monthAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || paymentFilter !== "all" || dateFilter !== "all";

  if (authChecking) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="bg-card border-border max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-display text-foreground mb-2 text-center">Admin Access Required</h3>
              <p className="text-muted-foreground text-center text-sm sm:text-base mb-6">
                Please login to access the order management panel.
              </p>
              <Button onClick={() => navigate('/auth')}>
                Login to Admin
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <Card className="bg-card border-border max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mb-4" />
              <h3 className="text-lg sm:text-xl font-display text-foreground mb-2 text-center">Access Denied</h3>
              <p className="text-muted-foreground text-center text-sm sm:text-base mb-6">
                You don't have admin privileges to access this page.
              </p>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-4 sm:py-8 px-3 sm:px-4 scroll-smooth">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl text-foreground">Order Management</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">View and manage all customer orders</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2">
                {filteredOrders.length} / {orders.length} Orders
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1 sm:gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Filters Section */}
          <Card className="bg-card border-border mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, order ID, or transaction ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-sm">
                      <Filter className="w-4 h-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="text-sm">
                      <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_FILTERS.map((payment) => (
                        <SelectItem key={payment.value} value={payment.value}>
                          {payment.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="text-sm">
                      <Calendar className="w-4 h-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg sm:text-xl font-display text-foreground mb-2">
                  {hasActiveFilters ? "No Matching Orders" : "No Orders Yet"}
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base text-center">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more orders." 
                    : "Orders will appear here when customers place them."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="bg-card border-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b border-border p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <CardTitle className="font-display text-base sm:text-lg">
                          #{order.id.slice(0, 8)}
                        </CardTitle>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                          disabled={updatingStatus === order.id}
                        >
                          <SelectTrigger className="w-[130px] sm:w-[160px] text-sm">
                            {updatingStatus === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Update status" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.filter(s => s.value !== 'all').map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="sm:hidden text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.created_at)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                            👤
                          </span>
                          Customer Details
                        </h4>
                        <div className="space-y-2 pl-9 sm:pl-10 text-sm">
                          <p className="text-foreground font-medium">{order.customer_name}</p>
                          <p className="text-muted-foreground flex items-center gap-2">
                            <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                            <a href={`tel:${order.customer_phone}`} className="hover:text-primary transition-colors">
                              {order.customer_phone}
                            </a>
                          </p>
                          <p className="text-muted-foreground flex items-center gap-2">
                            <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                            <a href={`mailto:${order.customer_email}`} className="hover:text-primary transition-colors truncate">
                              {order.customer_email}
                            </a>
                          </p>
                          <p className="text-muted-foreground flex items-start gap-2">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mt-1 flex-shrink-0" />
                            <span className="break-words">{order.customer_address}</span>
                          </p>
                        </div>

                        {/* Payment Info */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 text-sm">
                            {order.payment_method === 'bkash' ? (
                              <Smartphone className="w-4 h-4 text-pink-500" />
                            ) : order.payment_method === 'nagad' ? (
                              <Smartphone className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Banknote className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-muted-foreground">Payment:</span>
                            <span className="font-medium capitalize">
                              {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method || 'COD'}
                            </span>
                          </div>
                          {order.transaction_id && (
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">TxID:</span>
                              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[150px] sm:max-w-none">
                                {order.transaction_id}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
                          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                            🛍️
                          </span>
                          Order Items
                        </h4>
                        <div className="space-y-2 pl-9 sm:pl-10 text-sm">
                          {order.items.map((item, idx) => {
                            const normalized = normalizeOrderItem(item);
                            return (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-foreground truncate mr-2">
                                  {normalized.name} <span className="text-muted-foreground">x{normalized.quantity}</span>
                                </span>
                                <span className="text-primary font-medium shrink-0">৳{normalized.price.toLocaleString()}</span>
                              </div>
                            );
                          })}
                          <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-display text-lg sm:text-xl text-primary">৳{order.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWhatsApp(order)}
                        className="gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`tel:${order.customer_phone}`, '_self')}
                        className="gap-1 sm:gap-2 text-xs sm:text-sm"
                      >
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOrderToDelete(order)}
                        disabled={deletingOrder === order.id}
                        className="gap-1 sm:gap-2 text-xs sm:text-sm text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                      >
                        {deletingOrder === order.id ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order #{orderToDelete?.id.slice(0, 8)}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDelete && deleteOrder(orderToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Admin;
