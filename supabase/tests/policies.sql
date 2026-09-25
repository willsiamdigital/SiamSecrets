-- Behavioural tests for RLS, moderation, auction and reports. Run via run.sh.
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000000a','admin@x'),('00000000-0000-0000-0000-00000000000b','alice@x'),('00000000-0000-0000-0000-00000000000c','bob@x');
insert into public.admins values ('00000000-0000-0000-0000-00000000000a');

create schema tst;
create function tst.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then
    if position(needle in sqlerrm) = 0 then raise exception 'expected "%" got "%"', needle, sqlerrm; end if;
    raise notice 'ok (rejected): %', sqlerrm; return;
  end;
  raise exception 'expected error "%" but statement succeeded: %', needle, sql;
end $$;
create function tst.check(ok boolean, msg text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', msg; end if; raise notice 'ok: %', msg; end $$;
grant usage on schema tst to public; grant execute on all functions in schema tst to public;

-- anon
set role anon; set request.jwt.claim.sub = '';
select tst.check((select count(*) from search_listings()) = 20, 'anon sees 20 approved');
select tst.check((select count(*) from search_listings('thong', null)) = 1, 'search by area text');
select tst.check((select count(*) from search_listings('', 'Silom')) = 1, 'area filter');
select tst.check((select count(*) from search_listings('%', null)) = 20, 'wildcard chars harmless');
select tst.expect_error($$insert into listings(name,area,age,image_url,adult_declared_at) values ('x','y',20,'https://a',now())$$, 'row-level security');
select tst.expect_error($$select place_bid(1::smallint,1::bigint,6000)$$, 'permission denied');
update auction_slots set current_bid_cents=1;
reset role;
select tst.check((select current_bid_cents from auction_slots where position=1)=5000, 'anon cannot touch slots');

-- alice submits a listing trying to self-approve
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into listings(name,area,age,image_url,adult_declared_at,status,tier,is_demo) values ('Alice','Silom',22,'https://img/a.jpg',now(),'approved','featured',true);
select tst.check((select status::text||tier::text||is_demo::text from listings where name='Alice')='pendingdirectoryfalse', 'self-approval ignored');
select tst.expect_error($$insert into listings(name,area,age,image_url,adult_declared_at) values ('Kid','Silom',17,'https://a',now())$$, 'listings_age_check');
select tst.expect_error($$insert into listings(name,area,age,image_url) values ('NoDecl','Silom',20,'https://a')$$, 'adult_declared_at');
select tst.check((select count(*) from search_listings()) = 20, 'pending not in directory');
select tst.expect_error($$select place_bid(1::smallint,(select id from listings where name='Alice'),6000)$$, 'own approved listings');
-- bob can't see alice's pending listing, nor edit it
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select tst.check((select count(*) from listings where name='Alice')=0, 'bob cannot see alice pending');
update listings set name='hacked' where name='Alice';
select tst.check((select count(*) from favourites)=0, 'bob favourites empty');
insert into favourites(listing_id) values (5);
select tst.expect_error($$insert into favourites(user_id,listing_id) values ('00000000-0000-0000-0000-00000000000b',6)$$, 'row-level security');

-- admin approves
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update listings set status='approved', reviewed_by=auth.uid(), reviewed_at=now() where name='Alice';
select tst.check((select count(*) from favourites)=0, 'admin cannot see bob favourites');

-- alice bids
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select tst.expect_error($$select place_bid(1::smallint,(select id from listings where name='Alice'),5400)$$, 'Minimum bid is €55.00');
select tst.expect_error($$select place_bid(1::smallint,(select id from listings where name='Alice'),5550)$$, 'whole euros');
select tst.expect_error($$select place_bid(1::smallint,4,6000)$$, 'own approved');
select (place_bid(1::smallint,(select id from listings where name='Alice'),5500)).current_bid_cents;
select tst.expect_error($$select place_bid(2::smallint,(select id from listings where name='Alice'),9000)$$, 'another featured slot');
select tst.check((select count(*) from bids)=1, 'alice sees her bid');
select tst.expect_error($$insert into bids(slot_position,listing_id,bidder_id,amount_cents) values (1,1,auth.uid(),999999)$$, 'row-level security');
-- alice edits approved listing -> back to pending; can't unset tier
update listings set availability='Busy' where name='Alice';
select tst.check((select status::text from listings where name='Alice')='approved', 'availability edit keeps approval');
update listings set name='Alicia', tier='featured' where name='Alice';
select tst.check((select status::text||tier::text from listings where name='Alicia')='pendingdirectory', 'content edit -> pending, tier locked');
update auction_slots set current_bid_cents=1;
reset role;
select tst.check((select listing_id from auction_slots where position=1)=(select id from listings where name='Alicia'), 'alice leads slot 1');

-- closed round
update auction_slots set round_ends_at = now() - interval '1 minute' where position = 3;
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update listings set status='approved' where name='Alicia';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select tst.expect_error($$select place_bid(3::smallint,(select id from listings where name='Alicia'),50000)$$, 'closed');

-- reports: anon reports underage -> suspended, removed from slot
set role anon; set request.jwt.claim.sub = '';
insert into reports(listing_id,reason,details) values ((select id from listings where name='Alicia'),'underage','looks young');

select tst.check((select count(*) from reports)=0, 'anon cannot read reports');
insert into reports(listing_id,reason) values (7,'spam_or_scam');
select tst.check((select count(*) from search_listings())=20, 'spam report does not suspend (7 still up), alicia gone');
select tst.expect_error($$insert into reports(listing_id,reason,status) values (7,'other','resolved')$$, 'row-level security');
reset role;
select tst.check((select status::text from listings where name='Alicia')='suspended', 'underage report suspends');
select tst.check((select listing_id is null and current_bid_cents is null from auction_slots where position=1), 'suspended listing leaves slot');
-- owner can't unsuspend by editing
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
update listings set name='Alicia2', status='approved' where name='Alicia';
select tst.check((select status::text from listings where name='Alicia2')='suspended', 'owner cannot lift suspension');
select tst.check((select count(*) from reports)=0, 'alice cannot read reports');
select tst.check(not is_admin(), 'alice not admin');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select tst.check(is_admin(), 'admin is admin');
select tst.check((select count(*) from reports where status='open')=2, 'admin sees reports');
update reports set status='resolved', resolved_by=auth.uid(), resolved_at=now() where reason='spam_or_scam';
reset role;
select tst.check((select count(*) from listings where name='hacked')=0, 'bob could not rename alice listing');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
update listings set status='suspended' where id=2;
reset role;
select tst.check((select listing_id is null from auction_slots where position=2), 'admin suspension releases slot');
\echo ALL TESTS PASSED
