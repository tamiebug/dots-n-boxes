import React , { Component } from "react";

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


export class SelectableTable extends Component {
  /**
   * A Table with selectable rows, buttons, and modifiable data.
   * An example on class use can be found underneath definition.
   */
  state = {
    /* Integer.  Currently selected row in table.  -1 indicates no selected row */
    selectedRow: -1,
    /* Array.  Table data in row-major javascript Array. */
    data: this.props.data,
    /* Number. The desired relative lengths of table columns, can have any total */
    columnLengths: this.props.columnLengths,
    /* Array[string].  JS Array of strings containing column names */
    columnNames: this.props.columnNames,
    /* Array[function]. List of callbacks to give to buttons below table */
    buttonCallbacks: this.props.buttonCallbacks,
    /* Array[string].   List of labels to give buttons below table */
    buttonLabels: this.props.buttonLabels,
    /* Function.  Alternative method to change component state */
    updater: this.props.updater,
  };

  render() {
    this.validateState();
    const totalColumnLengths = this.state.columnLengths.reduce((a,b) => a + b, 0);
    const percentageColumnLengths = this.state.columnLengths.map( length => 100 * length / totalColumnLengths);
    console.log(percentageColumnLengths);
    const prefix = this.props.prefix || 'btn';

    return (
      <div className="selectableMenu">
        <table>
          <thead>
            <tr>
              {this.state.columnLengths.map((length, index) => {
                return <th style={{width: `${percentageColumnLengths[index]}%`}} key={index}>{this.state.columnNames[index]}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            { this.state.data.map((dataRow, index) => {
              return (
                <tr key={ dataRow.key } onClick={() => this.setState({ selectedRow: index })}
                 className={ this.state.selectedRow == index ? 'selected' : '' }>
                  { dataRow.cells.map((text, colIndex) => {
                    return <td style={ {width: `${percentageColumnLengths[colIndex]}%`} } key={ colIndex }>{ text }</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tableButtons">
          {this.state.buttonLabels ? this.state.buttonLabels.map((label, index) => {
            return <button type="button" className={`${prefix}-${index}`} onClick={this.getWrappedButtonCallback(index)} key={index}>{label}</button>;
          }) : ""}
        </div>
      </div>
    );
  }

  validateState() {
    if (this.state.columnLengths === undefined) {
      throw `Desired column widths array not passed in`;
    } else if (this.state.columnNames === undefined) {
      throw `Desired column names array not passed in`;
    } else if (this.state.columnNames.length !== this.state.columnLengths.length) {
      throw `Length mismatch: columnNames contains ${this.state.columnNames.length} entries while columnLengths contains ${this.state.columnLengths.length} entries`;
    } else if (this.state.columnLengths.length !== this.state.data[0].cells.length) {
      throw `Length mismatch!  ${this.state.columnLengths.length} columnLengths.length to ${this.state.data[0].length} length of first data row`;
    } else if ( this.state.buttonLabels !== undefined || this.state.buttonCallbacks !== undefined ) {
      if ( this.state.buttonLabels.length !== this.state.buttonCallbacks.length) {
        throw `buttonLabels length and buttonCallback length mismatch!`;
      }
    }
  }

  getWrappedButtonCallback(index) {
    const rawCallback = this.state.buttonCallbacks[index];
    if (rawCallback === undefined) {
      throw `Button callback number ${index} is undefined`;
    }

    //TODO: Is there a more idiomatic way of doing this or recording this contract?
    return () => rawCallback({
      data: this.state.data,
      selectedRow: this.state.selectedRow,
      updater: settings => this.updateTable(settings),
    });
  }

  updateTable(settings) {
    /**
     * Update table with new state as introduced by the settings object
     * Ensure that the selection is updated as well to have same key as previously, if it still exists
     * See class definition to see what state variables exist for changing.
     */
    this.setState((state) => {
      const newState = Object.assign([], state, settings);

      let selectedRow = undefined;
      let oldKey = undefined;
      if (0 <= state.selectedRow && state.selectedRow < state.data.length) {
        oldKey = state.data[state.selectedRow].key;
        if (oldKey !== undefined) selectedRow = newState.data.findIndex(row => row.key == oldKey);
        if (selectedRow == undefined) selectedRow = -1;
      } 
      const keyChange = {'selectedRow': selectedRow};
      return Object.assign([], newState, keyChange);
    },
    () => this.validateState());
  }
}

/** 
 * Example of how to use the above component table.
 * Keys are used for data rows in order to keep track of selected elements
 * between updates;  After deletions and insertions, the keys lead us back
 * to the correct selections.

import React, { Component } from "react";
import { SelectableTable } from "./SelectableTable.js";
import { hot } from "react-hot-loader"

export class App extends Component {
	render() {
		return (
			<div className="App">
				<SelectableTable 
					columnLengths={[3,2,7]}
					buttonLabels={["Move Up", "Move Down"]}
					buttonCallbacks={[
						(settings) => this.specialFoo(settings),
						(settings) => this.specialFoo2(settings),
					]}
					columnNames={[
						"Name",
						"Size",
						"Comments"
					]}
					data={[
						{key: 1, cells: ['Tamie', '3x3', 'No Rush 20!!']},
						{key: 2, cells: ['Paul', '5x5', 'Play me.']},
						{key: 3, cells: ['Tamie', '3x3', 'No Rush 20!!']},
						{key: 4, cells: ['Paul', '5x5', 'Play me.']},
						{key: 5, cells: ['Paul', '4x4', 'Play me plserino?']},
					]}
				/>
			</div>
		)
	}

	specialFoo(settings) {
		if (settings.selectedRow === undefined) return;
		if (settings.data === undefined) return;

		const data = settings.data.map((row, index) => {
			return {
				key: row.key + 1,
				cells: row.cells
			};
		});
		settings.updater({data: data});
	}

	specialFoo2(settings) {
		if (settings.selectedRow === undefined) return;
		if (settings.data === undefined) return;

		const data = settings.data.map((row, index) => {
			return {
				key: row.key - 1,
				cells: row.cells
			};
		});
		settings.updater({data: data});
	}
}

export default hot(module)(App);
**/