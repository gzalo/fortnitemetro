<?php
	class Config{
		const DB_HOST = 'influxdb';
		const DB_PORT = 8086;
		const DB_NAME = 'fortnite';
		const CACHE_TTL = 600;
		const FETCH_DATA = [
			["displayName"=>"gzalo.com", "id"=>"70a6a4da3b7f421fb26c7b237cb6bb4d"],
			["displayName"=>"NikAwEsOmE81", "id"=>"3436931051bb409e948ce3d054ee2102"],
			["displayName"=>"DeSartre", "id"=>"4959d60dbfe14d3299596155aa8b14e6"],
			["displayName"=>"dadperez", "id"=>"05a51609559f44fab1dab6ca65fa021c"],
			["displayName"=>"Nachox86", "id"=>"83cf360414cc4f4187ac6b3d2a65af65"],
			["displayName"=>"SypherPK", "id"=>"cfd16ec54126497ca57485c1ee1987dc"],
			["displayName"=>"ninja", "id"=>"4735ce9132924caf8a5b17789b40f79c"],
			["displayName"=>"Muselk", "id"=>"69ac01e2f1ec459cb6d54ede252113cf"],
			["displayName"=>"XulElan", "id"=>"f27d9dcbd9224edbaee80ceaa387fb7b"],
			["displayName"=>"L0VEMACHiNEtw", "id"=>"8ad67c0c4bc9458c807d9cf8591304c0"],
		];
		const IGNORE_USERNAMES = ["WILLYREX123456", "calamar95", "Gisegi", "Seververman", "MuaveKersey", "Not Tfue"];
		const IGNORE_STATS_COLOR = ["SypherPK", "Not Tfue", "Muselk", "Melitittaa", "ninja", "WILLYREX123456"];
		const COLS_STATS_COLOR = ["matches_played_total", "wins_total", "kills_total", "kdr_total", "score_total", "momentum", "dmomentum"];
		const CATEG_NAMES = ["Malísimos", "Mejores jugadores"];
		const CATEG_USERS = ["gzalo.com"=>1, "MuaveKersey"=>1, "NikAwEsOmE81"=>1, "DeSartre"=>1, "dadperez"=>1, "Nachox86"=>1, "XulElan" => 1, "L0VEMACHiNEtw" => 1,
		"SypherPK"=>0, "ninja"=>0, "Muselk"=>0, "WILLYREX123456"=>0, "Not Tfue"=>0];
	}	