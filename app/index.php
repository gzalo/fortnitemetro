<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Fortnitemetro - Estadísticas de Fortnite</title>

    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
	<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.1.0/css/all.css" integrity="sha384-lKuwvrZot6UHsBSfcMvOkWwlCMgc0TaWr+30HWe3a4ltaBwTZhyTEggF5tJv8tbt" crossorigin="anonymous">
	
	<link rel="stylesheet" href="styles.css?v=<?php echo filemtime("styles.css"); ?>">
	<link rel="shortcut icon" href="img/favicon.ico" type="image/x-icon">
	<link rel="icon" href="img/favicon.ico" type="image/x-icon">
	<link rel="icon" type="image/png" href="img/favicon-32x32.png" sizes="32x32" />
	<link rel="icon" type="image/png" href="img/favicon-16x16.png" sizes="16x16" />
    <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
  </head>
  <body>


   <header>
      <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
		<div style="background-image: url(img/logofull.png);" id="logo">
			<img src="img/logo.png" alt="Fortnitemetro - Estadísticas de Fortnite"/>
		</div>
	
      </nav>
    </header>
  
	<main role="main" class="container">

		<!--<h1>En mantenimiento...</h1>
		<h3>Algunas funciones del sitio (cálculo de variaciones, totales y gráficos) pueden funcionar incorrectamente</h3>-->
	
		<div id="plotDiv"></div>
		<div id="statsTable"></div>
					
		<div id="rangeSelector"></div>
		<p><a href="fortnite_subir.vbs">Script calculador de horas jugadas</a></p>
		
		<div id="muaveTip"></div>
			
    </main>
  
	<footer class="footer">
      <div class="container">
        <span class="text-muted">2019 - Gzalo.com | <span id="lastUpdate"></span></span>
      </div>
    </footer>
	
	<div id="preloader">
		<div id="loader">
			<div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div>
		</div>
    </div>
	
    <script src="https://code.jquery.com/jquery-3.2.1.min.js" ></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
	<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>
	<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>
	<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
	<link href="vendor/tabulator/css/tabulator_modern.min.css" rel="stylesheet">
	<script type="text/javascript" src="vendor/tabulator/js/tabulator.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/vue/dist/vue.js"></script>

	<script src="main.js?v=<?php echo filemtime("main.js"); ?>"></script>
  </body>
</html>
