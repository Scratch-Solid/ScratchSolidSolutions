-- Create 15 new bookings in Northern Suburbs
INSERT INTO bookings (id, location, status) VALUES
(2009, '15 Rose Street, Bellville, Cape Town', 'completed'),
(2010, '42 Daisy Avenue, Parow, Cape Town', 'completed'),
(2011, '8 Lily Lane, Durbanville, Cape Town', 'completed'),
(2012, '33 Maple Road, Brackenfell, Cape Town', 'completed'),
(2013, '77 Protea Drive, Kraaifontein, Cape Town', 'completed'),
(2014, '21 Sunflower Way, Goodwood, Cape Town', 'completed'),
(2015, '5 Jasmine Close, Plattekloof, Cape Town', 'completed'),
(2016, '88 Fynbos Street, Kuils River, Cape Town', 'completed'),
(2017, '14 Thyme Avenue, Edgemead, Cape Town', 'completed'),
(2018, '3 Lavender Lane, Bothasig, Cape Town', 'completed'),
(2019, '66 Olive Road, Panorama, Cape Town', 'completed'),
(2020, '29 Palm Street, Table View, Cape Town', 'completed'),
(2021, '11 Coral Drive, Blouberg, Cape Town', 'completed'),
(2022, '52 Orchid Way, Milnerton, Cape Town', 'completed'),
(2023, '7 Hibiscus Lane, Pinelands, Cape Town', 'completed');

-- Create 15 new reviews: 6 low-average (1-3), 9 average-good (3-5)
INSERT INTO reviews (id, user_id, booking_id, rating, text, images, status) VALUES
-- Low to average reviews (ratings 1-3)
(3009, 229, 2009, 2, 'The cleaners arrived late and missed a few spots. Disappointed with the service quality this time.', '[]', 'approved'),
(3010, 230, 2010, 3, 'An okay clean but not as thorough as I expected. Some dust remained on the shelves.', '[]', 'approved'),
(3011, 231, 2011, 1, 'Very poor experience. The bathroom was still dirty and floors were sticky. Will not recommend.', '[]', 'approved'),
(3012, 232, 2012, 2, 'Arrived without proper equipment. Had to wait while they went back to fetch supplies. Wasted my morning.', '[]', 'approved'),
(3013, 233, 2013, 3, 'Average clean. Not bad but nothing special either. Might try again to see if it improves.', '[]', 'approved'),
(3014, 234, 2014, 2, 'The service was rushed. They left after only 2 hours when I paid for 4. Very disappointed.', '[]', 'approved'),
-- Average to good reviews (ratings 3-5)
(3015, 235, 2015, 4, 'Good service overall. The kitchen looked amazing after they finished. Just a small missed spot behind the couch.', '[]', 'approved'),
(3016, 236, 2016, 5, 'Absolutely fantastic! My home has never looked better. The team was professional and thorough.', '[]', 'approved'),
(3017, 237, 2017, 4, 'Reliable and consistent quality. I book weekly cleanings and they always deliver. Highly recommended.', '[]', 'approved'),
(3018, 238, 2018, 5, 'Outstanding deep clean! They got rid of stains I thought were permanent. Will definitely book again.', '[]', 'approved'),
(3019, 239, 2019, 4, 'Friendly team, great attention to detail. My windows are sparkling clean for the first time in months.', '[]', 'approved'),
(3020, 240, 2020, 3, 'Decent clean for the price. The team was polite and worked hard. Could be more thorough in the bedrooms.', '[]', 'approved'),
(3021, 241, 2021, 5, 'Best cleaning service in the area! They transformed my apartment before my parents visited. So grateful!', '[]', 'approved'),
(3022, 242, 2022, 4, 'Very happy with the move-out clean. Got my full deposit back thanks to their thorough work.', '[]', 'approved'),
(3023, 243, 2023, 5, 'Exceptional service from start to finish. Easy booking, on-time arrival, and immaculate results. Five stars!', '[]', 'approved');
