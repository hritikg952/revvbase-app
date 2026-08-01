revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy "Active listings are publicly readable" on public.listings;
drop policy "Owners can read all their listings" on public.listings;

create policy "Active listings are publicly readable"
on public.listings
for select
to anon
using (status = 'active');

create policy "Authenticated users can read active or owned listings"
on public.listings
for select
to authenticated
using (
  status = 'active'
  or (select auth.uid()) = seller_id
);
