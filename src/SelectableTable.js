import React , { useEffect, useState, useRef } from "react";

/*
		case "remote":
				if (settings.isHost) {
					player1 = new LocalHumanPlayer(settings.playerName1);
					player2 = new RemotePlayer(settings.playerName2);
					// Do some post-player creation setup / connection?
					// If this post-player creation setup fails, have a fallback?
				} else {
					player1 = new RemotePlayer(settings.playerName1);
					player2 = new LocalHumanPlayer(settings.playerName2);
					// DO post-player creation setup / connection?
				}
*/


export function SelectableTable (props) {
  const [ dummyVariable, setDummyVariable ] = useState(false);  // only used to trigger re-renders on ref change.

  const previousData = useRef();  
  useEffect(() => {
    const selectedRow = props.selectedRow;
    let newSelectedRow = -1;
    if (previousData.current && 0 <= props.selectedRow && props.selectedRow < previousData.current.length) {
      // find what key it used to correspond to... this is always defined...
      const oldKey = previousData.current[props.selectedRow].key;
      if (oldKey !== undefined) {
        newSelectedRow = props.data.findIndex(row => row.key == oldKey);
      } 
    }
    props.setSelectedRow(newSelectedRow);
    setDummyVariable(!dummyVariable);
    previousData.current = props.data;
  }, [ props.data ]);

  validateProps(props);
  const totalColumnLengths = props.columnLengths.reduce((a,b) => a + b, 0);
  const percentageColumnLengths = props.columnLengths.map( length => 100 * length / totalColumnLengths);

  return previousData.current === undefined ? null : (
    <div className="selectableMenu">
      <table>
        <thead>
          <tr>
            { percentageColumnLengths.map((percentage, index) => {
              return <th style={{width: `${ percentage }%`}} key={ index }>{ props.columnNames[index] }</th>;
            })}
          </tr>
        </thead>
        <tbody>
          { previousData.current.map((dataRow, index) => {
            return (
              <tr key={ dataRow.key } onClick={ () => props.setSelectedRow( index ) }
                className={ props.selectedRow == index ? 'selected' : '' }>
                { dataRow.cells.map((text, colIndex) => {
                  return <td style={{ width: `${percentageColumnLengths[colIndex]}%` }} key={ colIndex }>{ text }</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function validateProps(props) {
  if (props.columnLengths === undefined) {
    throw `Desired column widths array not passed in`;
  } else if (props.columnNames === undefined) {
    throw `Desired column names array not passed in`;
  } else if (props.columnNames.length !== props.columnLengths.length) {
    throw `Length mismatch: columnNames contains ${ props.columnNames.length } entries while columnLengths contains ${ props.columnLengths.length } entries`;
  } else if (props.columnLengths.length !== props.data[0].cells.length) {
    throw `Length mismatch!  ${ props.columnLengths.length } columnLengths.length to ${ props.data[0].length } length of first data row`;
  } else if (props.buttonLabels !== undefined || props.buttonCallbacks !== undefined) {
    if ( props.buttonLabels.length !== props.buttonCallbacks.length) {
      throw `buttonLabels length and buttonCallback length mismatch!`;
    }
  }
}