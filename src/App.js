/* src/App.js */
import React, { useEffect, useState } from "react";
import Amplify, { API, graphqlOperation, Storage } from "aws-amplify";
import * as Mutation from "./graphql/mutations";
import * as Query from "./graphql/queries";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import awsExports from "./aws-exports";
Amplify.configure(awsExports);

const initialFormData = { name: "", description: "" };
const App = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  function setInput(key, value) {
    setFormData({ ...formData, [key]: value });
  }

  async function fetchNotes() {
    try {
      const noteData = await API.graphql(graphqlOperation(Query.listNotes));
      const notes = noteData.data.listNotes.items;
      await Promise.all(
        notes.map(async (note) => {
          if (note.image) {
            const image = await Storage.get(note.image);
            note.image = image;
          }
          return note;
        })
      );
      setNotes(noteData.data.listNotes.items);
    } catch (err) {
      console.log("error fetching notes");
    }
  }

  async function addNote() {
    try {
      if (!formData.name || !formData.description) return;
      await API.graphql(
        graphqlOperation(Mutation.createNote, { input: formData })
      );
      if (formData.image) {
        const image = await Storage.get(formData.image);
        formData.image = image;
      }
      setNotes([...notes, formData]);
      setFormData(initialFormData);
    } catch (err) {
      console.log("error creating note:", err);
    }
  }

  async function deleteNote({ id }) {
    try {
      const newNotesArray = notes.filter((note) => note.id !== id);
      setNotes(newNotesArray);
      await API.graphql({
        query: Mutation.deleteNote,
        variables: { input: { id } },
      });
    } catch (err) {
      console.log("error deleting note:", err);
    }
  }

  async function onChange(e) {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={styles.container}>
          <h1>Hello {user.username}</h1>
          <button style={styles.button} onClick={signOut}>
            Sign out
          </button>
          <br />
          <h2>Amplify Notes</h2>
          <input
            onChange={(event) => setInput("name", event.target.value)}
            style={styles.input}
            value={formData.name}
            placeholder="Name"
          />
          <input
            onChange={(event) => setInput("description", event.target.value)}
            style={styles.input}
            value={formData.description}
            placeholder="Description"
          />
          <input type="file" onChange={onChange} />
          <button style={styles.button} onClick={addNote}>
            Create Note
          </button>
          {notes.map((note, index) => (
            <div key={note.id ? note.id : index} style={styles.note}>
              <p style={styles.noteName}>{note.name}</p>
              <p style={styles.noteDescription}>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delte Note</button>
              {note.image && (
                <img src={note.image} style={{ width: 400 }} alt={note.name} />
              )}
            </div>
          ))}
        </div>
      )}
    </Authenticator>
  );
};

const styles = {
  container: {
    width: 400,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: 20,
  },
  note: { marginBottom: 15 },
  input: {
    border: "none",
    backgroundColor: "#ddd",
    marginBottom: 10,
    padding: 8,
    fontSize: 18,
  },
  noteName: { fontSize: 20, fontWeight: "bold" },
  noteDescription: { marginBottom: 0 },
  button: {
    backgroundColor: "black",
    color: "white",
    outline: "none",
    fontSize: 18,
    padding: "12px 0px",
  },
};

export default App;
