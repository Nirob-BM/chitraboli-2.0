
DROP POLICY IF EXISTS "Users can manage their own linked accounts" ON public.linked_accounts;
CREATE POLICY "Users can manage their own linked accounts"
ON public.linked_accounts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage their own addresses"
ON public.user_addresses FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.user_addresses;
CREATE POLICY "Admins can manage all addresses"
ON public.user_addresses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlist;
CREATE POLICY "Users can manage their own wishlist"
ON public.wishlist FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Cart items insertable" ON public.cart_items;
CREATE POLICY "Cart items insertable"
ON public.cart_items FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL)
);

DROP POLICY IF EXISTS "Cart items updatable by owner" ON public.cart_items;
CREATE POLICY "Cart items updatable by owner"
ON public.cart_items FOR UPDATE
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
