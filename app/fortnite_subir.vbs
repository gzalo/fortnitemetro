Dim strURL
Dim HTTP
Dim dataRequest

strURL = "https://fortnite.gzalo.com/parse_time.php"
Set HTTP = CreateObject("Microsoft.XMLHTTP")

Set sh = CreateObject("WScript.Shell")
config = sh.ExpandEnvironmentStrings("%localappdata%/FortniteGame/Saved/Config/WindowsClient/GameUserSettings.ini")


Set fso = CreateObject("Scripting.FileSystemObject")
Set file = fso.GetFile(config)

With file.OpenAsTextStream()
	content = .Read(file.Size)
	.Close
End With

dataRequest = content

HTTP.open "POST", strURL, False
HTTP.setRequestHeader "Content-Type", "multipart/form-data"
HTTP.setRequestHeader "Content-Length", Len(dataRequest)

HTTP.send dataRequest
MsgBox HTTP.responseText, vbOKOnly, "Fortnite"
'WScript.Echo HTTP.responseText

Set HTTP = Nothing