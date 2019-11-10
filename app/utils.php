<?php
	// Converts a timestamp into a pleasant text
	function timeDiff($fecha){
		$periodos   = array("segundo", "minuto", "hora", "día", "semana", "mes", "año");
		$largo      = array(60,60,24,7,4.35,12);
		$ahora      = time();

		if($ahora == $fecha)
			return "ahora";

		if($ahora > $fecha){
			$diferencia = $ahora - $fecha;
			$p1 = "hace";
		}else{
			$diferencia = $fecha - $ahora;
			$p1 = "dentro de";
		}
		for($j = 0; $diferencia>=$largo[$j] && $j < count($largo)-1 ;$j++){
			$diferencia/= $largo[$j];
		}
		$diferencia = round($diferencia);
		if($diferencia!=1){
			if($periodos[$j] == "mes") $periodos[$j].="e";
			$periodos[$j] .= 's';
		}
		return "$p1 $diferencia $periodos[$j]";
	}
	
	// Filters rows of a measurement, to remove duplicated points
	function filterRow(&$row){
		$newRowX = array();
		$newRowY = array();
		
		for($idx = 0;$idx<count($row['x']);$idx++){
			$currValue = $row['y'][$idx];
			
			if(isset($row['y'][$idx-1]))
				$leftValue = $row['y'][$idx-1];
			else	
				$leftValue = -1;
			
			
			if(isset($row['y'][$idx+1]))
				$rightValue = $row['y'][$idx+1];
			else	
				$rightValue = -1;
		
			if($currValue != $leftValue || $currValue != $rightValue){
				$newRowX[] = $row['x'][$idx];
				$newRowY[] = $row['y'][$idx];
				/*unset($row['x'][$idx]);
				unset($row['y'][$idx]);*/
			}
		}
		
		$row['x'] = $newRowX;;
		$row['y'] = $newRowY;
	}
