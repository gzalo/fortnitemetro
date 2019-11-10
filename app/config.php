<?php
	class Config{
		const DB_HOST = 'influxdb';
		const DB_PORT = 8086;
		const DB_NAME = 'fortnite';
		const CACHE_TTL = 600;
		const FETCH_USERNAMES = ["gzalo.com", "NikAwEsOmE81", /*"MuaveKersey",*/ "DeSartre", "dadperez", "Nachox86", "SypherPK", "ninja", "Muselk", "Not Tfue", "XulElan", "L0VEMACHiNEtw"];
		const IGNORE_USERNAMES = ["WILLYREX123456", "calamar95", "Gisegi", "Seververman", "MuaveKersey"];
		const IGNORE_STATS_COLOR = ["SypherPK", "Not Tfue", "Muselk", "Melitittaa", "ninja", "WILLYREX123456"];
		const COLS_STATS_COLOR = ["matches_played_total", "wins_total", "kills_total", "kdr_total", "score_total", "momentum", "dmomentum"];
		const CATEG_NAMES = ["Malísimos", "Mejores jugadores"];
		const CATEG_USERS = ["gzalo.com"=>1, "MuaveKersey"=>1, "NikAwEsOmE81"=>1, "DeSartre"=>1, "dadperez"=>1, "Nachox86"=>1, "XulElan" => 1, "L0VEMACHiNEtw" => 1,
		"SypherPK"=>0, "ninja"=>0, "Muselk"=>0, "WILLYREX123456"=>0, "Not Tfue"=>0];
	}	