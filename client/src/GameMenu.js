import React, { useState, createContext} from "react";
import { CSSTransition, TransitionGroup } from 'react-transition-group';

export const GameMenuContext = createContext( null );

export function GameMenu({ children, defaultFormSettings, startingItemName, name, showMenu }) {
  const [ formData, setFormData ] = useState({...defaultFormSettings});
  const [ currentMenuPage, setCurrentMenuPage ] = useState(startingItemName);
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);
  const [ isUndoAction, setIsUndoAction ] = useState(false);

  const pageNames = React.Children.map( children, children => children.props.name );

  const context = {
    linkTo: (destination, undo) => {
      if (undo) {
        const [lastPage, ...restOfPages] = previousMenuPages;
        setPreviousMenuPages(restOfPages);
        setIsUndoAction(true);
        setCurrentMenuPage(lastPage);
      } else {
        setPreviousMenuPages([currentMenuPage, ...previousMenuPages]);
        setCurrentMenuPage(destination);
        setIsUndoAction(false);
      }
    },
    menuName: name,
    formData: formData,
    setFormData: data => setFormData(data),
  };

  const classNames = `gameMenuItem${isUndoAction ? "-reverse" : ""}`;
  showMenu = showMenu == undefined ? true : showMenu;
  return (
    showMenu && <div className="gameMenuModal">
      <TransitionGroup childFactory={ element => React.cloneElement( element, { classNames })}>
        <CSSTransition
          key={ currentMenuPage }
          classNames={ `gameMenuItem${isUndoAction ? "-reverse" : ""}` }
          timeout={500}
        >
          <GameMenuContext.Provider value = { context }>
            <div className="gameMenuModalContent">
              <div className="gameMenuModalHeader">
                <h2> { currentMenuPage } </h2>
              </div>
              <div className="gameMenuModalBody">
                { Array.isArray( children ) ? children[ pageNames.indexOf(currentMenuPage)] : children }
              </div>
              <div className="gameMenuModalFooter">
                { previousMenuPages.length > 0 && <button type="button" onClick={() => context.linkTo(undefined, true)}> Previous </button>}
              </div>
            </div>
          </GameMenuContext.Provider>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
}