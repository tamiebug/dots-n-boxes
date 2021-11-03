import React, { useEffect, useState, useContext } from "react";
import { SocketContext } from "../SocketContext.js";
import { SelectableTable } from "../SelectableTable.js";

export function AvailableGamesListComponent({ linkTo, formData }) {
  const { getOpenGamesList, joinLobby } = useContext(SocketContext);

  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(-1);

  const data_fetch_timeout = 8000;

  useEffect(() => {
    getOpenGamesList(gamesList => {
      setData([...gamesList]);
    });

    const fetchInterval = setInterval(() => {
      getOpenGamesList(gamesList => {
        setData([...gamesList]);
      });
    }, data_fetch_timeout);

    return function cleanup() { clearInterval(fetchInterval); };
  }, []);

  const tabulatedData = data.map(entry => ({
    key: entry.gameId,
    cells: [
      entry.hostName,
      `${entry.dimensions.boardWidth} x ${entry.dimensions.boardHeight}`,
      entry.description,
    ],
  }));

  const joinOnClick = e => {
    e.preventDefault();
    // TODO: Should we inform the user that they need to select an active game?
    if (selectedRow == -1)
      return;
    const dataRow = data[selectedRow];
    const requestResponseCallback = success => {
      if ( success ) {
        linkTo("Game Lobby");
      } else {
        console.log(`game join request failure`);
        getOpenGamesList(gamesList => {
          setData([...gamesList]);
        });
      }
    };
    joinLobby( formData.onlineName, dataRow.hostName, requestResponseCallback );
  };

  return (
    <div className="onlineGamesTable">
      <SelectableTable
        columnLengths={[3, 2, 7]}
        columnNames={[
          "User Name",
          "Size",
          "Comments"
        ]}
        data={tabulatedData}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow} />
      <div className="tableButtons">
        <button onClick={() => linkTo("Host Game Lobby")}> Host Game </button>
        <button onClick={joinOnClick}> Join Selected Game </button>
      </div>
    </div>
  );
}