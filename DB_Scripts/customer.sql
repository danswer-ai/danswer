CREATE TABLE public.customer (
                                 customerid int4 NOT NULL,
                                 firstname varchar(40) NOT NULL,
                                 lastname varchar(20) NOT NULL,
                                 company varchar(80) NULL,
                                 address varchar(70) NULL,
                                 city varchar(40) NULL,
                                 state varchar(40) NULL,
                                 country varchar(40) NULL,
                                 postalcode varchar(10) NULL,
                                 phone varchar(24) NULL,
                                 fax varchar(24) NULL,
                                 email varchar(60) NOT NULL,
                                 supportrepid int4 NULL,
                                 CONSTRAINT pk_customer PRIMARY KEY (customerid)
);


INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(1, 'Luís', 'Gonçalves', 'Embraer - Empresa Brasileira de Aeronáutica S.A.', 'Av. Brigadeiro Faria Lima, 2170', 'São José dos Campos', 'SP', 'Brazil', '12227-000', '+55 (12) 3923-5555', '+55 (12) 3923-5566', 'luisg@embraer.com.br', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(2, 'Leonie', 'Köhler', NULL, 'Theodor-Heuss-Straße 34', 'Stuttgart', NULL, 'Germany', '70174', '+49 0711 2842222', NULL, 'leonekohler@surfeu.de', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(3, 'François', 'Tremblay', NULL, '1498 rue Bélanger', 'Montréal', 'QC', 'Canada', 'H2G 1A7', '+1 (514) 721-4711', NULL, 'ftremblay@gmail.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(4, 'Bjørn', 'Hansen', NULL, 'Ullevålsveien 14', 'Oslo', NULL, 'Norway', '0171', '+47 22 44 22 22', NULL, 'bjorn.hansen@yahoo.no', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(5, 'František', 'Wichterlová', 'JetBrains s.r.o.', 'Klanova 9/506', 'Prague', NULL, 'Czech Republic', '14700', '+420 2 4172 5555', '+420 2 4172 5555', 'frantisekw@jetbrains.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(6, 'Helena', 'Holý', NULL, 'Rilská 3174/6', 'Prague', NULL, 'Czech Republic', '14300', '+420 2 4177 0449', NULL, 'hholy@gmail.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(7, 'Astrid', 'Gruber', NULL, 'Rotenturmstraße 4, 1010 Innere Stadt', 'Vienne', NULL, 'Austria', '1010', '+43 01 5134505', NULL, 'astrid.gruber@apple.at', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(8, 'Daan', 'Peeters', NULL, 'Grétrystraat 63', 'Brussels', NULL, 'Belgium', '1000', '+32 02 219 03 03', NULL, 'daan_peeters@apple.be', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(9, 'Kara', 'Nielsen', NULL, 'Sønder Boulevard 51', 'Copenhagen', NULL, 'Denmark', '1720', '+453 3331 9991', NULL, 'kara.nielsen@jubii.dk', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(10, 'Eduardo', 'Martins', 'Woodstock Discos', 'Rua Dr. Falcão Filho, 155', 'São Paulo', 'SP', 'Brazil', '01007-010', '+55 (11) 3033-5446', '+55 (11) 3033-4564', 'eduardo@woodstock.com.br', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(11, 'Alexandre', 'Rocha', 'Banco do Brasil S.A.', 'Av. Paulista, 2022', 'São Paulo', 'SP', 'Brazil', '01310-200', '+55 (11) 3055-3278', '+55 (11) 3055-8131', 'alero@uol.com.br', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(12, 'Roberto', 'Almeida', 'Riotur', 'Praça Pio X, 119', 'Rio de Janeiro', 'RJ', 'Brazil', '20040-020', '+55 (21) 2271-7000', '+55 (21) 2271-7070', 'roberto.almeida@riotur.gov.br', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(13, 'Fernanda', 'Ramos', NULL, 'Qe 7 Bloco G', 'Brasília', 'DF', 'Brazil', '71020-677', '+55 (61) 3363-5547', '+55 (61) 3363-7855', 'fernadaramos4@uol.com.br', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(14, 'Mark', 'Philips', 'Telus', '8210 111 ST NW', 'Edmonton', 'AB', 'Canada', 'T6G 2C7', '+1 (780) 434-4554', '+1 (780) 434-5565', 'mphilips12@shaw.ca', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(15, 'Jennifer', 'Peterson', 'Rogers Canada', '700 W Pender Street', 'Vancouver', 'BC', 'Canada', 'V6C 1G8', '+1 (604) 688-2255', '+1 (604) 688-8756', 'jenniferp@rogers.ca', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(16, 'Frank', 'Harris', 'Google Inc.', '1600 Amphitheatre Parkway', 'Mountain View', 'CA', 'USA', '94043-1351', '+1 (650) 253-0000', '+1 (650) 253-0000', 'fharris@google.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(17, 'Jack', 'Smith', 'Microsoft Corporation', '1 Microsoft Way', 'Redmond', 'WA', 'USA', '98052-8300', '+1 (425) 882-8080', '+1 (425) 882-8081', 'jacksmith@microsoft.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(18, 'Michelle', 'Brooks', NULL, '627 Broadway', 'New York', 'NY', 'USA', '10012-2612', '+1 (212) 221-3546', '+1 (212) 221-4679', 'michelleb@aol.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(19, 'Tim', 'Goyer', 'Apple Inc.', '1 Infinite Loop', 'Cupertino', 'CA', 'USA', '95014', '+1 (408) 996-1010', '+1 (408) 996-1011', 'tgoyer@apple.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(20, 'Dan', 'Miller', NULL, '541 Del Medio Avenue', 'Mountain View', 'CA', 'USA', '94040-111', '+1 (650) 644-3358', NULL, 'dmiller@comcast.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(21, 'Kathy', 'Chase', NULL, '801 W 4th Street', 'Reno', 'NV', 'USA', '89503', '+1 (775) 223-7665', NULL, 'kachase@hotmail.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(22, 'Heather', 'Leacock', NULL, '120 S Orange Ave', 'Orlando', 'FL', 'USA', '32801', '+1 (407) 999-7788', NULL, 'hleacock@gmail.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(23, 'John', 'Gordon', NULL, '69 Salem Street', 'Boston', 'MA', 'USA', '2113', '+1 (617) 522-1333', NULL, 'johngordon22@yahoo.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(24, 'Frank', 'Ralston', NULL, '162 E Superior Street', 'Chicago', 'IL', 'USA', '60611', '+1 (312) 332-3232', NULL, 'fralston@gmail.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(25, 'Victor', 'Stevens', NULL, '319 N. Frances Street', 'Madison', 'WI', 'USA', '53703', '+1 (608) 257-0597', NULL, 'vstevens@yahoo.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(26, 'Richard', 'Cunningham', NULL, '2211 W Berry Street', 'Fort Worth', 'TX', 'USA', '76110', '+1 (817) 924-7272', NULL, 'ricunningham@hotmail.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(27, 'Patrick', 'Gray', NULL, '1033 N Park Ave', 'Tucson', 'AZ', 'USA', '85719', '+1 (520) 622-4200', NULL, 'patrick.gray@aol.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(28, 'Julia', 'Barnett', NULL, '302 S 700 E', 'Salt Lake City', 'UT', 'USA', '84102', '+1 (801) 531-7272', NULL, 'jubarnett@gmail.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(29, 'Robert', 'Brown', NULL, '796 Dundas Street West', 'Toronto', 'ON', 'Canada', 'M6J 1V1', '+1 (416) 363-8888', NULL, 'robbrown@shaw.ca', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(30, 'Edward', 'Francis', NULL, '230 Elgin Street', 'Ottawa', 'ON', 'Canada', 'K2P 1L7', '+1 (613) 234-3322', NULL, 'edfrancis@yachoo.ca', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(31, 'Martha', 'Silk', NULL, '194A Chain Lake Drive', 'Halifax', 'NS', 'Canada', 'B3S 1C5', '+1 (902) 450-0450', NULL, 'marthasilk@gmail.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(32, 'Aaron', 'Mitchell', NULL, '696 Osborne Street', 'Winnipeg', 'MB', 'Canada', 'R3L 2B9', '+1 (204) 452-6452', NULL, 'aaronmitchell@yahoo.ca', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(33, 'Ellie', 'Sullivan', NULL, '5112 48 Street', 'Yellowknife', 'NT', 'Canada', 'X1A 1N6', '+1 (867) 920-2233', NULL, 'ellie.sullivan@shaw.ca', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(34, 'João', 'Fernandes', NULL, 'Rua da Assunção 53', 'Lisbon', NULL, 'Portugal', NULL, '+351 (213) 466-111', NULL, 'jfernandes@yahoo.pt', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(35, 'Madalena', 'Sampaio', NULL, 'Rua dos Campeões Europeus de Viena, 4350', 'Porto', NULL, 'Portugal', NULL, '+351 (225) 022-448', NULL, 'masampaio@sapo.pt', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(36, 'Hannah', 'Schneider', NULL, 'Tauentzienstraße 8', 'Berlin', NULL, 'Germany', '10789', '+49 030 26550280', NULL, 'hannah.schneider@yahoo.de', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(37, 'Fynn', 'Zimmermann', NULL, 'Berger Straße 10', 'Frankfurt', NULL, 'Germany', '60316', '+49 069 40598889', NULL, 'fzimmermann@yahoo.de', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(38, 'Niklas', 'Schröder', NULL, 'Barbarossastraße 19', 'Berlin', NULL, 'Germany', '10779', '+49 030 2141444', NULL, 'nschroder@surfeu.de', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(39, 'Camille', 'Bernard', NULL, '4, Rue Milton', 'Paris', NULL, 'France', '75009', '+33 01 49 70 65 65', NULL, 'camille.bernard@yahoo.fr', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(40, 'Dominique', 'Lefebvre', NULL, '8, Rue Hanovre', 'Paris', NULL, 'France', '75002', '+33 01 47 42 71 71', NULL, 'dominiquelefebvre@gmail.com', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(41, 'Marc', 'Dubois', NULL, '11, Place Bellecour', 'Lyon', NULL, 'France', '69002', '+33 04 78 30 30 30', NULL, 'marc.dubois@hotmail.com', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(42, 'Wyatt', 'Girard', NULL, '9, Place Louis Barthou', 'Bordeaux', NULL, 'France', '33000', '+33 05 56 96 96 96', NULL, 'wyatt.girard@yahoo.fr', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(43, 'Isabelle', 'Mercier', NULL, '68, Rue Jouvence', 'Dijon', NULL, 'France', '21000', '+33 03 80 73 66 99', NULL, 'isabelle_mercier@apple.fr', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(44, 'Terhi', 'Hämäläinen', NULL, 'Porthaninkatu 9', 'Helsinki', NULL, 'Finland', '00530', '+358 09 870 2000', NULL, 'terhi.hamalainen@apple.fi', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(45, 'Ladislav', 'Kovács', NULL, 'Erzsébet krt. 58.', 'Budapest', NULL, 'Hungary', 'H-1073', NULL, NULL, 'ladislav_kovacs@apple.hu', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(46, 'Hugh', 'O''Reilly', NULL, '3 Chatham Street', 'Dublin', 'Dublin', 'Ireland', NULL, '+353 01 6792424', NULL, 'hughoreilly@apple.ie', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(47, 'Lucas', 'Mancini', NULL, 'Via Degli Scipioni, 43', 'Rome', 'RM', 'Italy', '00192', '+39 06 39733434', NULL, 'lucas.mancini@yahoo.it', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(48, 'Johannes', 'Van der Berg', NULL, 'Lijnbaansgracht 120bg', 'Amsterdam', 'VV', 'Netherlands', '1016', '+31 020 6223130', NULL, 'johavanderberg@yahoo.nl', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(49, 'Stanisław', 'Wójcik', NULL, 'Ordynacka 10', 'Warsaw', NULL, 'Poland', '00-358', '+48 22 828 37 39', NULL, 'stanisław.wójcik@wp.pl', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(50, 'Enrique', 'Muñoz', NULL, 'C/ San Bernardo 85', 'Madrid', NULL, 'Spain', '28015', '+34 914 454 454', NULL, 'enrique_munoz@yahoo.es', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(51, 'Joakim', 'Johansson', NULL, 'Celsiusg. 9', 'Stockholm', NULL, 'Sweden', '11230', '+46 08-651 52 52', NULL, 'joakim.johansson@yahoo.se', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(52, 'Emma', 'Jones', NULL, '202 Hoxton Street', 'London', NULL, 'United Kingdom', 'N1 5LH', '+44 020 7707 0707', NULL, 'emma_jones@hotmail.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(53, 'Phil', 'Hughes', NULL, '113 Lupus St', 'London', NULL, 'United Kingdom', 'SW1V 3EN', '+44 020 7976 5722', NULL, 'phil.hughes@gmail.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(54, 'Steve', 'Murray', NULL, '110 Raeburn Pl', 'Edinburgh ', NULL, 'United Kingdom', 'EH4 1HH', '+44 0131 315 3300', NULL, 'steve.murray@yahoo.uk', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(55, 'Mark', 'Taylor', NULL, '421 Bourke Street', 'Sidney', 'NSW', 'Australia', '2010', '+61 (02) 9332 3633', NULL, 'mark.taylor@yahoo.au', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(56, 'Diego', 'Gutiérrez', NULL, '307 Macacha Güemes', 'Buenos Aires', NULL, 'Argentina', '1106', '+54 (0)11 4311 4333', NULL, 'diego.gutierrez@yahoo.ar', 4);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(57, 'Luis', 'Rojas', NULL, 'Calle Lira, 198', 'Santiago', NULL, 'Chile', NULL, '+56 (0)2 635 4444', NULL, 'luisrojas@yahoo.cl', 5);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(58, 'Manoj', 'Pareek', NULL, '12,Community Centre', 'Delhi', NULL, 'India', '110017', '+91 0124 39883988', NULL, 'manoj.pareek@rediff.com', 3);
INSERT INTO public.customer
(customerid, firstname, lastname, company, address, city, state, country, postalcode, phone, fax, email, supportrepid)
VALUES(59, 'Puja', 'Srivastava', NULL, '3,Raj Bhavan Road', 'Bangalore', NULL, 'India', '560001', '+91 080 22289999', NULL, 'puja_srivastava@yahoo.in', 3);