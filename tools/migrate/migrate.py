import sqlite3
import json
import dateutil.parser as dp
import os
from operator import itemgetter


def create_table(con):
    create_stats_sql = """
    CREATE TABLE stats (
        time INTEGER PRIMARY KEY AUTOINCREMENT,
        mode INTEGER NOT NULL,
        played INTEGER NOT NULL,
        wins INTEGER NOT NULL,
        kills INTEGER NOT NULL
        )"""

    con.execute(create_stats_sql)

    create_index_sql = "CREATE INDEX index_stats_mode ON stats(mode)"
    con.execute(create_index_sql)

    create_index_sql = "CREATE INDEX index_stats_time_mode ON stats(time,mode)"
    con.execute(create_index_sql)

    update_sequence_sql = "INSERT INTO sqlite_sequence (name,seq) values('stats', 1)"
    con.execute(update_sequence_sql)


def get_rows(filename, username_id):
    data = json.load(open(filename))
    outRows = []
    modes = {'solo': 0, 'squad': 1, 'duo': 2}
    lastForMode = {'solo': None, 'squad': None, 'duo': None}
    for row in data:
        time = int(dp.parse(row['time']).timestamp())*1000
        mode = row['mode']
        modeId = modes[mode]
        played = row['matches_played']
        wins = row['wins']
        kills = row['kills']

        if row['platform'] == 'xb1':
            continue

        if row['kills'] == 0 and username_id == 6:  # Ninja has a few bugged rows
            continue

        importantRows = (played, wins, kills)

        if lastForMode[mode] != importantRows:
            outRows.append((time, modeId, played, wins, kills))
            lastForMode[mode] = importantRows

    return outRows


def insert_data(cur, data):
    cur.executemany(
        "insert into stats(time, mode, played, wins, kills) values (MAX(?, (SELECT seq FROM sqlite_sequence) + 1),?,?,?,?)", data)


def show_all(cur):
    cur.execute("select played,wins,kills from stats where mode=0")
    rows = cur.fetchall()
    print(len(rows))

    for row in rows:
        print(str(row[0]) + " " + str(row[1]) + " " + str(row[2]))


def show_latest(cur):
    #cur.execute("select mode, max(wins) from stats group by mode")
    cur.execute(
        "SELECT * FROM stats where time in (SELECT max(time) FROM stats GROUP BY mode) order by mode")
    print(cur.fetchall())


usernames = ["gzalo.com",
             "NikAwEsOmE81",
             "DeSartre",
             "dadperez",
             "Nachox86",
             "SypherPK",
             "ninja",
             "Muselk",
             "XulElan",
             "L0VEMACHiNEtw"]

for i in range(0, len(usernames)):
    db_filename = 'out/db_'+str(i)+'.sqlite3'

    try:
        os.remove(db_filename)
    except OSError:
        pass

    con = sqlite3.connect(db_filename)
    cur = con.cursor()

    create_table(cur)

    data = get_rows("dump/"+usernames[i] + ".json", i)
    insert_data(cur, data)

    con.commit()
    con.close()

# show_all(cur)
# show_latest(cur)
