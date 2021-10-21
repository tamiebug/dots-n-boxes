import React, { useState } from "react";
import { CSSTransition, TransitionGroup } from 'react-transition-group';

export function GameMenu({ defaultFormSettings, startingItemName, name, menuItems, showMenu }) {
  const [ formData, setFormData ] = useState({...defaultFormSettings});

  const [ currentMenuPage, setCurrentMenuPage ] = useState(startingItemName);
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);
  const [ isUndoAction, setIsUndoAction ] = useState(false);

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
          <div className="gameMenuModalContent">
            <div className="gameMenuModalHeader">
              <h2> { currentMenuPage } </h2>
            </div>
            <div className="gameMenuModalBody">
              { menuItems[currentMenuPage](context) }
            </div>
            <div className="gameMenuModalFooter">
              { previousMenuPages.length > 0 && <button type="button" onClick={() => context.linkTo(undefined, true)}> Previous </button>}
            </div>
          </div>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
}
