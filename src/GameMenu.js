import React, { useState } from "react";
import { CSSTransition, TransitionGroup } from 'react-transition-group';


export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});

  const [ currentMenuPage, setCurrentMenuPage ] = useState(props.startingItemName);
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
    menuName: props.name,
    formData: formData,
    setFormData: data => setFormData(data),
    currentPage: currentMenuPage,
  };

  const classNames = `gameMenuItem${isUndoAction ? "-reverse" : ""}`;
  return (
    <div className="gameMenuModal">
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
            { props.items(context)[currentMenuPage ] }
            <div className="gameMenuModalFooter">
              { previousMenuPages.length > 0 && <button type="button" onClick={() => context.linkTo(undefined, true)}> Previous </button>}
            </div>
          </div>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
}

export function GameMenuItem(props) {
  return (
    <div className="gameMenuModalBody">
      { props.children }
    </div>
  );
}