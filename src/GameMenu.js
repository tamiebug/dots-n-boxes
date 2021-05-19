import React, { useState } from "react";
import { SwitchTransition, CSSTransition } from 'react-transition-group';


export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});

  const [ currentMenuPage, setCurrentMenuPage ] = useState(props.startingItemName);
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);

  const context = { 
    linkTo: (destination, undo) => {
      if (undo) {
        const [lastPage, ...restOfPages] = previousMenuPages;
        setPreviousMenuPages(restOfPages);
        setCurrentMenuPage(lastPage);
      } else {
        setPreviousMenuPages([currentMenuPage, ...previousMenuPages]);
        setCurrentMenuPage(destination);
      }
    },
    menuName: props.name,
    formData: formData,
    setFormData: data => setFormData(data),
    currentPage: currentMenuPage,
  };

  return (
    <div className="gameMenuModal">
      <SwitchTransition mode={"out-in"}>
        <CSSTransition
          key={ currentMenuPage }
          classNames='gameMenuItem'
          addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
        >
          <div className="gameMenuModalContent">
            <div className="gameMenuModalHeader">
              <h2> { currentMenuPage } </h2>
            </div>
            { props.items(context)[currentMenuPage] }
            <div className="gameMenuModalFooter">
              { previousMenuPages.length > 0 && <button type="button" onClick={() => context.linkTo(undefined, true)}> Previous </button>}
            </div>
          </div>
        </CSSTransition>
      </SwitchTransition>
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