<?php
error_reporting(0);
header("Content-Type: text/javascript");
$tmpFile = "./yt/ytmp";
$decodeFile = "./yt/ytdecode";
function getContent($content,$file) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (X11; Linux x86_64; rv:40.0) Gecko/20100101 Firefox/40.0");
    curl_setopt($ch, CURLOPT_URL, $content);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FILE, fopen($file,"w+"));
    $ret = curl_exec($ch);
    if(!$ret) {
        echo curl_error($ch);
        return false;
    }
    return true;
}
function searchInFile($regex,$file) {
    $handle = fopen($file, "r");
    if ($handle) {
        while (($line = fgets($handle,65535)) !== false) {
            if(preg_match($regex, $line, $matches)){
                break;
            }
        }
        fclose($handle);
        return $matches;
    } else {
        return false;
    }    
}
if(!getContent("https://www.youtube.com/watch?v=jNQXAC9IVRw",$tmpFile)) die('Can\'t access youtube');
$ythtml = file_get_contents($tmpFile);
preg_match('/ytplayer.config = {(.*?)};/',$ythtml,$match);
$ytconfig = json_decode('{'.$match[1].'}');
$js = $ytconfig->assets->js;
preg_match("/html5player-new-.*?-(.*?)\//", $js, $match);
$actual = file_get_contents($decodeFile);
if(preg_match("/".$match[1]."/",$actual)){
    echo $actual;
} else {
    $content =  "// ".$match[1]."\n";
    if(substr($js, 0, 2) === "//") {
        $js = "https:".$js;
    }
    if(!getContent($js,$tmpFile)) die('Can\'t access htmlplayer');
    $signatureCode = searchInFile("/\(.=(.*)\(.*\),.*=.*\(.*,\"\/signature\/\"\+.*\)\);/",$tmpFile);
    // var_dump($signatureCode);
    $signatureCode2 = searchInFile("/function ".str_replace("$",'\$',$signatureCode[1])."\\((.*?)\\){(.*?)return(.*?)};/",$tmpFile);
    // var_dump($signatureCode2);
    preg_match("/(.*)=?(.*)\.(.*)\(.*,(.*)\)?;/", $signatureCode2[2],$signatureCode3);
    // var_dump($signatureCode3);
    preg_match("/;(.*?)\..*\(.*\)/", $signatureCode3[1],$signatureCode4);
    // var_dump($signatureCode4);
    $signatureCode5 = searchInFile("/var ".str_replace("$",'\$',$signatureCode4[1])."={(.*?)};f/",$tmpFile);
    // var_dump($signatureCode5);
    $content .= "Vanilla.decodeYTHelper={".$signatureCode5[1]."};\n";
    $content .= "Vanilla.decodeYT = function(".$signatureCode2[1]."){".str_replace($signatureCode4[1],"Vanilla.decodeYTHelper",$signatureCode2[2])." return ".$signatureCode2[3]."};";
    file_put_contents($decodeFile, $content);
    echo $content;
}
file_put_contents($tmpFile, '');
?>