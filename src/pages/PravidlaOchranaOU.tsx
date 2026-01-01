const PravidlaOchranaOU = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pravidla a ochrana osobních údajů</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Pravidla soutěže</h2>
          <p className="text-muted-foreground">
            Zde budou uvedena pravidla soutěže a podmínky účasti.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-3">Ochrana osobních údajů</h2>
          <p className="text-muted-foreground">
            Informace o zpracování a ochraně osobních údajů účastníků.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PravidlaOchranaOU;
