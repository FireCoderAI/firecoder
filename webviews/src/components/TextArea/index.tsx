import { useEffect, useRef } from "react";
import styles from "./styles.module.css";
type Props = {
  onChange: (text: string) => void;
  onSubmit: () => void;
  buttonStart?: any;
  buttonEnd?: any;
  value?: string;
};

const TextArea = ({
  onChange,
  buttonStart,
  buttonEnd,
  value,
  onSubmit,
}: Props) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current !== null && value === "") {
      textAreaRef.current.style.height = "1px";
      textAreaRef.current.style.height =
        (textAreaRef.current.scrollHeight > textAreaRef.current.clientHeight
          ? textAreaRef.current.scrollHeight
          : 34) + "px";
    }
  }, [value]);

  return (
    <div className={styles.root}>
      {buttonStart && <div className={styles.buttonStart}>{buttonStart}</div>}
      <textarea
        autoFocus
        ref={textAreaRef}
        value={value}
        className={styles.main}
        onChange={(event) => {
          const target = event.target;

          if (textAreaRef.current !== null) {
            textAreaRef.current.style.height = "1px";
            textAreaRef.current.style.height =
              (textAreaRef.current.scrollHeight >
              textAreaRef.current.clientHeight
                ? textAreaRef.current.scrollHeight
                : 34) + "px";
          }
          onChange(target.value);
        }}
        onKeyDown={(event) => {
          if (event.which === 13 && !event.shiftKey && !event.ctrlKey) {
            if (!event.repeat) {
              onSubmit();
            }

            event.preventDefault(); // Prevents the addition of a new line in the text field
          }
        }}
      ></textarea>
      {buttonEnd && <div className={styles.buttonEnd}>{buttonEnd}</div>}
    </div>
  );
};

// 24 42 61
export default TextArea;
